use std::sync::Mutex;
use std::time::Duration;
use tiny_http::{Response, Server};

use crate::google_drive::tokens::{current_timestamp, delete_tokens, get_credentials, save_tokens};
use crate::google_drive::types::{StoredTokens, TokenResponse, UserInfoResponse};

const OAUTH_SCOPES: &str = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email";

// Ports to try for OAuth callback (in order)
const OAUTH_PORTS: &[u16] = &[18089, 18090, 18091, 18092, 18093];

// Global state for OAuth callback
lazy_static::lazy_static! {
    pub static ref ACTIVE_PORT: Mutex<Option<u16>> = Mutex::new(None);
    pub static ref OAUTH_STATE: Mutex<Option<String>> = Mutex::new(None);
}

fn find_available_port() -> Result<u16, String> {
    for &port in OAUTH_PORTS {
        let addr = format!("127.0.0.1:{}", port);
        if std::net::TcpListener::bind(&addr).is_ok() {
            return Ok(port);
        }
    }
    Err(format!(
        "Kaikki OAuth-portit ({}) ovat varattuja. Sulje muut sovellukset ja yritä uudelleen.",
        OAUTH_PORTS.iter().map(|p| p.to_string()).collect::<Vec<_>>().join(", ")
    ))
}

pub fn generate_auth_url() -> Result<String, String> {
    let creds = get_credentials()?;

    // Find an available port
    let port = find_available_port()?;
    *ACTIVE_PORT.lock().unwrap() = Some(port);

    // Generate a random state for CSRF protection
    let state = uuid::Uuid::new_v4().to_string();
    *OAUTH_STATE.lock().unwrap() = Some(state.clone());

    let redirect_uri = format!("http://localhost:{}", port);
    let encoded_redirect = urlencoding::encode(&redirect_uri);
    let encoded_scope = urlencoding::encode(OAUTH_SCOPES);

    let url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope={}&access_type=offline&prompt=consent&state={}",
        creds.client_id,
        encoded_redirect,
        encoded_scope,
        state
    );

    Ok(url)
}

pub async fn wait_for_oauth_callback() -> Result<String, String> {
    let port = ACTIVE_PORT.lock().unwrap()
        .ok_or("OAuth-porttia ei ole asetettu. Aloita kirjautuminen uudelleen.")?;

    let addr = format!("127.0.0.1:{}", port);
    let server = Server::http(&addr).map_err(|e| format!("OAuth-palvelimen käynnistys epäonnistui portissa {}: {}", port, e))?;

    // Wait for the callback with a timeout
    let timeout = Duration::from_secs(300); // 5 minutes
    let request = server
        .recv_timeout(timeout)
        .map_err(|e| format!("Failed to receive OAuth callback: {}", e))?
        .ok_or("OAuth callback timed out")?;

    let url = request.url().to_string();

    // Parse the code and state from the URL
    let mut code: Option<String> = None;
    let mut state: Option<String> = None;

    if let Some(query_start) = url.find('?') {
        let query = &url[query_start + 1..];
        for param in query.split('&') {
            if let Some((key, value)) = param.split_once('=') {
                match key {
                    "code" => code = Some(urlencoding::decode(value).unwrap_or_default().to_string()),
                    "state" => state = Some(value.to_string()),
                    _ => {}
                }
            }
        }
    }

    // Send a response to the browser
    let html = r#"
        <!DOCTYPE html>
        <html>
        <head>
            <title>Loikka - Kirjautuminen onnistui</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                       display: flex; justify-content: center; align-items: center; height: 100vh;
                       margin: 0; background: #0A0A0A; color: #E8E8E8; }
                .container { text-align: center; }
                h1 { color: #60A5FA; }
                p { color: #888888; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Kirjautuminen onnistui!</h1>
                <p>Voit sulkea tämän ikkunan ja palata Loikka-sovellukseen.</p>
            </div>
        </body>
        </html>
    "#;

    let response = Response::from_string(html).with_header(
        tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap(),
    );
    let _ = request.respond(response);

    // Verify state
    let expected_state = OAUTH_STATE.lock().unwrap().take();
    if state != expected_state {
        return Err("Invalid OAuth state - possible CSRF attack".to_string());
    }

    code.ok_or_else(|| "No authorization code received".to_string())
}

pub async fn exchange_code_for_tokens(code: &str) -> Result<StoredTokens, String> {
    let creds = get_credentials()?;
    let client = reqwest::Client::new();

    let port = ACTIVE_PORT.lock().unwrap()
        .ok_or("OAuth-porttia ei ole asetettu. Aloita kirjautuminen uudelleen.")?;
    let redirect_uri = format!("http://localhost:{}", port);

    let params = [
        ("client_id", creds.client_id.as_str()),
        ("client_secret", creds.client_secret.as_str()),
        ("code", code),
        ("redirect_uri", redirect_uri.as_str()),
        ("grant_type", "authorization_code"),
    ];

    let response = client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Failed to exchange code: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Token exchange failed: {}", error_text));
    }

    let token_response: TokenResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    let refresh_token = token_response
        .refresh_token
        .ok_or("No refresh token received")?;

    // Get user email
    let user_email = get_user_email(&token_response.access_token).await.ok();

    let tokens = StoredTokens {
        access_token: token_response.access_token,
        refresh_token,
        expires_at: current_timestamp() + token_response.expires_in,
        user_email,
    };

    save_tokens(&tokens)?;
    Ok(tokens)
}

async fn get_user_email(access_token: &str) -> Result<String, String> {
    let client = reqwest::Client::new();

    let response = client
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("Failed to get user info: {}", e))?;

    let user_info: UserInfoResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse user info: {}", e))?;

    Ok(user_info.email)
}

pub fn disconnect() -> Result<(), String> {
    delete_tokens()
}
