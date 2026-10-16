# Google Drive compatibility

`GoogleOAuthClient` takes an externally owned `HttpClient`, desktop client
configuration, and an `ITokenStore`. Configuration is read only from the explicit
deployment directory's `oauth-client.json`, never the working directory or a
developer fallback. Its shape is Google's `installed.client_id` and optional
`installed.client_secret`. No real client configuration is included here.

`ConnectAsync` reserves one IPv4 loopback port from 18089–18093 before invoking
the supplied external-browser delegate. It uses a new cryptographic state and
S256 PKCE verifier, the original drive.file/userinfo.email scopes, exact root
callback/Host matching, a five-minute overall limit, bounded header reading and
cancellation. Every path disposes the listener. The code exchange/refresh does
not surface raw Google error bodies. Refresh uses `grant_type=refresh_token`
and preserves the previous refresh token if Google omits a replacement.

`WindowsTokenStore` writes an atomic, Windows-current-user DPAPI-protected file.
Use `<native data root>/google-tokens.dpapi`. It does not read legacy plaintext
tokens or copy them into a backup. Disconnect deletes only this local protected
file and does not delete cloud backups.

`DriveClient` follows list pagination, rejects repeated page tokens, validates
app-folder membership before deleting a backup, and recursively lists gallery
and profile media. GET/PATCH/DELETE transient failures have at most three tries;
authentication can refresh once. Creates are not blindly retried after an
unknown outcome. Upload first checks for an existing same-name object; duplicate
same-name files/folders require resolution instead of arbitrary selection.

`DriveBackupService` receives the local database and optional release/reopen
callbacks. The caller must serialize writes throughout restore and retain a
stable per-root instance lock across directory swaps. The WinUI app holds its
sibling `<root>.instance.lock` throughout; callbacks are no-op because database
connections are operation-scoped with pooling disabled. A caller that owns
persistent handles must release and reopen those handles in the callbacks.

Upload takes a SQLite backup snapshot and recursively selects media. Category
flags are enforced even for individual selections. `SelectedPhotoIds = null`
means all files of selected categories; `[]` means none. Upload selections are
absolute managed local paths; restore selections are known cloud IDs.

The restore picker uses `ListRestorePhotosAsync(backupId, includeDatabase)`.
An explicit backup ID scopes both the picker and restore to that backup's native
manifest even when the database is unchecked. A null ID with database selected
uses the latest backup. Only a null ID with photo-only restore exposes the full
app media library. Legacy backups without a manifest expose their shared media
library because the old format has no per-backup photo identity.

The root remains `Loikka Backups`. New database files are named
`loikka_backup_YYYYMMDD_HHMMSS_<8hex>.db`; the suffix prevents collisions.
Each new upload has a separate manifest with `format: loikka-native-drive` and
`version: 1`, distinct from the legacy JSON export version. It associates the
database ID/hash with original relative media paths, cloud IDs, sizes and SHA256
hashes. Originals live under `photos/snapshot_<stamp>/...` or
`profile_photos/snapshot_<stamp>/...`; an older completed backup's media is not
overwritten by later uploads. Media-only transfers have their own manifest.
Listing maps these physical cloud paths back to original relative paths. A
native database without its final manifest is an incomplete transfer and cannot
silently restore through the legacy reader. Partial upload exceptions identify
the failed item and count of completed items; partial work is not a success.

Restore downloads only known files into a sibling staging root. It preserves
the current unselected media, local preferences and protected token file. A
photo-only restore snapshots the current database and never downloads a cloud
database. Manifests are version/membership/path/hash checked. Legacy flat photos
remain readable; rooted old references are mapped by their exact managed path.
Only legacy restores may fall back to one unambiguous flat basename, and that
file must have been downloaded in the current restore from the correct legacy
category. Existing local files and native manifest media never supply a
basename fallback. Missing native references remain unchanged and are reported.
No reference is repaired by global string replacement.
Unresolved references are retained and reported. Legacy shared media cannot
prove historical image versions or recover originals that were never uploaded.

`SnapshotRestoreService` validates schema, integrity and foreign keys before
activation, retains the immediately preceding root, and journals the directory
swap for recovery. Download, validation or cancellation failures preserve the
active root. The app owns reopening services and refreshing affected pages.

Tests use only injected HTTP responses, generated temporary SQLite/media data,
synthetic DPAPI tokens and local synthetic callbacks. Existing-account backup
visibility under the intended OAuth application, real sign-in/refresh, quota
behavior and live upload/restore remain release acceptance requirements.

Primary protocol references checked during implementation:
[Google native OAuth](https://developers.google.com/identity/protocols/oauth2/native-app),
[Drive search and pagination](https://developers.google.com/workspace/drive/api/guides/search-files),
[Drive uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads).
