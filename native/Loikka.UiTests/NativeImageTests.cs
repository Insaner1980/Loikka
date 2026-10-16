using Loikka_App.Services;
using System.Security.Cryptography;
using Windows.Graphics.Imaging;

namespace Loikka.UiTests;

[TestClass]
[OSCondition(OperatingSystems.Windows)]
public sealed class NativeImageTests
{
    [TestMethod]
    [DataRow("transparent.png", 600u, 300u, 1u, 300u, 150u)]
    [DataRow("photo.jpg", 600u, 300u, 1u, 300u, 150u)]
    [DataRow("animated.gif", 32u, 16u, 2u, 32u, 16u)]
    [DataRow("transparent.webp", 600u, 300u, 1u, 300u, 150u)]
    public async Task Thumbnail_SupportedImage_PreservesOriginalAndDimensions(string name, uint width, uint height, uint frames, uint thumbWidth, uint thumbHeight)
    {
        var original = Path.Combine(AppContext.BaseDirectory, "Fixtures", name);
        // The filename comes only from the four fixed DataRow values above.
        // nosemgrep: csharp.lang.security.filesystem.unsafe-path-combine.unsafe-path-combine
        var hash = SHA256.HashData(await File.ReadAllBytesAsync(original, TestContext.CancellationToken));
        var temporary = Path.Combine(Path.GetTempPath(), "Loikka-codec-" + Guid.NewGuid().ToString("N") + ".png");
        try
        {
            var info = await NativeImageCodec.CreateThumbnail(original, temporary);
            Assert.AreEqual(width, info.Width);
            Assert.AreEqual(height, info.Height);
            Assert.AreEqual(frames, info.Frames);
            using var stream = File.OpenRead(temporary);
            using var random = stream.AsRandomAccessStream();
            var decoder = await BitmapDecoder.CreateAsync(random);
            Assert.AreEqual(thumbWidth, decoder.PixelWidth);
            Assert.AreEqual(thumbHeight, decoder.PixelHeight);
            if (name.StartsWith("transparent", StringComparison.Ordinal))
            {
                var pixels = (await decoder.GetPixelDataAsync()).DetachPixelData();
                var alpha = pixels.Where((_, index) => index % 4 == 3).ToArray();
                Assert.Contains((byte)0, alpha);
                Assert.Contains(value => value > 0 && value < 255, alpha, "Transparency must survive the PNG thumbnail.");
            }

            // Reread the same fixed DataRow fixture to verify the original remains unchanged.
            // nosemgrep: csharp.lang.security.filesystem.unsafe-path-combine.unsafe-path-combine
            Assert.AreSequenceEqual(hash, SHA256.HashData(await File.ReadAllBytesAsync(original, TestContext.CancellationToken)));
        }
        finally
        {
            if (File.Exists(temporary))
            {
                File.Delete(temporary);
            }
        }
    }

    [TestMethod]
    public async Task Thumbnail_CorruptImage_LeavesOriginalAndNoPartialThumbnail()
    {
        var root = Path.Combine(Path.GetTempPath(), "Loikka-corrupt-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        var original = Path.Combine(root, "invalid.png");
        var thumbnail = Path.Combine(root, "thumb.png");
        await File.WriteAllBytesAsync(original, [1, 2, 3, 4], TestContext.CancellationToken);
        try
        {
            await Assert.ThrowsExactlyAsync<InvalidDataException>(() => NativeImageCodec.CreateThumbnail(original, thumbnail));
            Assert.AreSequenceEqual(new byte[] { 1, 2, 3, 4 }, await File.ReadAllBytesAsync(original, TestContext.CancellationToken));
            Assert.IsFalse(File.Exists(thumbnail));
        }
        finally
        {
            Directory.Delete(root, true);
        }
    }

    public TestContext TestContext { get; set; }
}
