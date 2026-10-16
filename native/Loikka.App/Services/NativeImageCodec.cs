using Windows.Graphics.Imaging;
using System.Runtime.InteropServices;

namespace Loikka_App.Services;

public sealed record NativeImageInfo(uint Width, uint Height, uint Frames);
public static class NativeImageCodec
{
    public static async Task<NativeImageInfo> CreateThumbnail(string original, string thumbnail)
    {
        bool created = false;
        try
        {
            using var input = File.OpenRead(original); using var randomInput = input.AsRandomAccessStream();
            var decoder = await BitmapDecoder.CreateAsync(randomInput);
            double ratio = Math.Min(1, 300.0 / Math.Max(decoder.PixelWidth, decoder.PixelHeight));
            var transform = new BitmapTransform { ScaledWidth = Math.Max(1, (uint)(decoder.PixelWidth * ratio)), ScaledHeight = Math.Max(1, (uint)(decoder.PixelHeight * ratio)) };
            using var bitmap = await decoder.GetSoftwareBitmapAsync(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied, transform, ExifOrientationMode.RespectExifOrientation, ColorManagementMode.ColorManageToSRgb);
            using var output = new FileStream(thumbnail, FileMode.CreateNew, FileAccess.ReadWrite, FileShare.None); created = true;
            using var randomOutput = output.AsRandomAccessStream();
            var encoder = await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId, randomOutput);
            encoder.SetSoftwareBitmap(bitmap); await encoder.FlushAsync();
            return new(decoder.PixelWidth, decoder.PixelHeight, decoder.FrameCount);
        }
        catch (Exception error) when (error is COMException or IOException or ArgumentException)
        {
            if (created && File.Exists(thumbnail)) File.Delete(thumbnail);
            throw new InvalidDataException("Kuvaa ei voitu avata tai pienoiskuvaa tallentaa. Tarkista tiedosto ja Windowsin kuvatuki.", error);
        }
    }
}
