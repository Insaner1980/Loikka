using Loikka.Core.Models;
using Loikka_App.Services;
using Loikka_App.Pages;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Windows.System;

namespace Loikka_App.Controls;

public sealed partial class PhotoViewer : UserControl
{
    private readonly List<Photo> photos;
    private readonly AppSession session;
    private readonly Image image = new()
    {
        Stretch = Stretch.Uniform,
        HorizontalAlignment = HorizontalAlignment.Center,
        VerticalAlignment = VerticalAlignment.Center
    };
    private readonly TextBlock caption = Ui.Text("");
    private readonly NumberBox position = new()
    {
        Minimum = 1,
        SmallChange = 1,
        Width = 100,
        SpinButtonPlacementMode = NumberBoxSpinButtonPlacementMode.Compact
    };
    private int index;
    private bool drawing;
    public PhotoViewer(AppSession session, IReadOnlyList<Photo> photos, int start, Action close)
    {
        this.session = session;
        this.photos = photos.ToList();
        index = Math.Clamp(start, 0, photos.Count - 1);
        IsTabStop = true;
        TabFocusNavigation = Microsoft.UI.Xaml.Input.KeyboardNavigationMode.Cycle;
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetAutomationId(this, "ViewerOverlay");
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(this, "Kuvakatselu");
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetAutomationId(position, "ViewerPosition");
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(position, "Kuvan numero");
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetAutomationId(caption, "ViewerCaption");
        var grid = new Grid
        {
            Background = (Brush)Application.Current.Resources["SolidBackgroundFillColorBaseBrush"],
            Padding = new Thickness(24),
            RowSpacing = 12
        };
        grid.Tapped += (_, args) =>
        {
            if (ReferenceEquals(args.OriginalSource, grid))
            {
                close();
                args.Handled = true;
            }
        };
        grid.RowDefinitions.Add(new() { Height = GridLength.Auto });
        grid.RowDefinitions.Add(new() { Height = new GridLength(1, GridUnitType.Star) });
        grid.RowDefinitions.Add(new() { Height = GridLength.Auto });
        var commands = new CommandBar
        {
            DefaultLabelPosition = CommandBarDefaultLabelPosition.Right
        };
        void Button(string text, Symbol symbol, Action action, string id)
        {
            var b = new AppBarButton
            {
                Label = text,
                Icon = new SymbolIcon(symbol)
            };
            Microsoft.UI.Xaml.Automation.AutomationProperties.SetAutomationId(b, id);
            b.Click += (_, _) => action();
            commands.PrimaryCommands.Add(b);
        }

        Button("Sulje", Symbol.Cancel, close, "ViewerClose");
        Button("Edellinen", Symbol.Back, () => Move(-1), "ViewerPrevious");
        Button("Seuraava", Symbol.Forward, () => Move(1), "ViewerNext");
        if (photos.All(p => p.Id > 0))
        {
            Button("Poista kuva", Symbol.Delete, async () => await DeletePhoto(close), "ViewerDelete");
        }

        commands.Content = position;
        grid.Children.Add(commands);
        Grid.SetRow(image, 1);
        grid.Children.Add(image);
        Grid.SetRow(caption, 2);
        grid.Children.Add(caption);
        Content = grid;
        position.ValueChanged += (_, _) =>
        {
            if (!drawing && double.IsFinite(position.Value))
            {
                index = Math.Clamp((int)position.Value - 1, 0, this.photos.Count - 1);
                Draw();
            }
        };
        image.ImageFailed += (_, _) => caption.Text += "\nKuvaa ei voitu avata. Alkuperäinen tiedosto voi puuttua tai Windowsin kuvatuki ei tunne muotoa.";
        KeyDown += (_, args) =>
        {
            if (args.Key == VirtualKey.Escape)
            {
                close();
                args.Handled = true;
            }

            if (args.Key is VirtualKey.Left or VirtualKey.Right && args.OriginalSource is not TextBox)
            {
                Move(args.Key == VirtualKey.Left ? -1 : 1);
                args.Handled = true;
            }
        };
        Loaded += (_, _) => Focus(FocusState.Programmatic);
        Draw();
    }

    protected override Microsoft.UI.Xaml.Automation.Peers.AutomationPeer OnCreateAutomationPeer() => new Microsoft.UI.Xaml.Automation.Peers.FrameworkElementAutomationPeer(this);
    private void Move(int offset)
    {
        index = (index + offset + photos.Count) % photos.Count;
        Draw();
    }

    private void Draw()
    {
        drawing = true;
        try
        {
            var photo = photos[index];
            position.Maximum = photos.Count;
            position.Value = index + 1;
            caption.Text = $"{index + 1} / {photos.Count} · {photo.EventName ?? photo.OriginalName}";
            image.Source = new BitmapImage(new Uri(new NativeFiles(session).ImageUri(photo.FilePath)!));
        }
        catch (Exception error)
        {
            image.Source = null;
            caption.Text = error.Message;
        }
        finally
        {
            drawing = false;
        }
    }

    private async Task DeletePhoto(Action close)
    {
        if (!await session.Confirm("Poista kuva?", "Kuva poistetaan Loikan omasta kirjastosta."))
        {
            return;
        }

        try
        {
            await new NativeFiles(session).DeletePhoto(this.photos[index]);
            this.photos.RemoveAt(index);
            if (this.photos.Count == 0)
            {
                close();
            }
            else
            {
                index = Math.Min(index, this.photos.Count - 1);
                Draw();
            }
        }
        catch (Exception error)
        {
            caption.Text = error.Message;
        }
    }
}
