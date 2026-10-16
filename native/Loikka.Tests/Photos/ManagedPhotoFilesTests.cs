using Loikka.Infrastructure.Photos;

namespace Loikka.Tests.Photos;

[TestClass]
public sealed class ManagedPhotoFilesTests
{
    [TestMethod]
    public void DeleteUnreferenced_SharedOriginalAndProfileReference_Survive()
    {
        var root = Path.Combine(Path.GetTempPath(), "Loikka-photo-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(root, "photos"));
        var shared = Path.Combine(root, "photos", "shared.jpg"); File.WriteAllText(shared, "shared-original");
        try
        {
            ManagedPhotoFiles.DeleteUnreferenced(root, ["photos/shared.jpg"], [shared]);
            Assert.AreEqual("shared-original", File.ReadAllText(shared));
            ManagedPhotoFiles.DeleteUnreferenced(root, [shared], ["photos/shared.jpg"]);
            Assert.IsTrue(File.Exists(shared));
        }
        finally { Directory.Delete(root, true); }
    }
    [TestMethod]
    public void DeleteUnreferenced_OnlyUnreferencedManagedFileIsRemoved()
    {
        var root = Path.Combine(Path.GetTempPath(), "Loikka-photo-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(root, "photos"));
        var original = Path.Combine(root, "photos", "original.jpg"); File.WriteAllText(original, "original");
        var external = Path.Combine(root, "external.jpg"); File.WriteAllText(external, "external");
        try
        {
            ManagedPhotoFiles.DeleteUnreferenced(root, ["photos/original.jpg", external], []);
            Assert.IsFalse(File.Exists(original)); Assert.AreEqual("external", File.ReadAllText(external));
        }
        finally { Directory.Delete(root, true); }
    }
}
