@{
    Solution = 'Loikka.slnx'
    TestProjects = @(
        @{
            Path = 'native/Loikka.Tests/Loikka.Tests.csproj'
            Configuration = 'Release'
        }
        @{
            Path = 'native/Loikka.UiTests/Loikka.UiTests.csproj'
            Configuration = 'Release'
        }
    )
    BuildProjects = @(
        @{
            Path = 'Loikka.slnx'
            Configuration = 'Release'
            Properties = @{
                Platform = 'x64'
            }
        }
    )
}
