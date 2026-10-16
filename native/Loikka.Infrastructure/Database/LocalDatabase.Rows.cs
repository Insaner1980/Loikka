using Loikka.Core.Models;
using Microsoft.Data.Sqlite;
using System.Text.Json;

namespace Loikka.Infrastructure.Database;

public sealed partial class LocalDatabase
{
    private const string CreatedAtKey = "created_at";
    private const string TimestampFormat = "yyyy-MM-dd HH:mm:ss";
    private const string AthleteIdKey = "athlete_id";
    private const string DisciplineIdKey = "discipline_id";
    private const string CompetitionNameKey = "competition_name";
    private const string CustomLevelNameKey = "custom_level_name";
    private const string LocationKey = "location";
    private const string NotesKey = "notes";
    private const string StatusKey = "status";
    private const string FilterParameter = "$filter";
    private const string CompetitionIdKey = "competition_id";
    private static Athlete ReadAthlete(SqliteDataReader r) => new()
    {
        Id = r.GetInt64(r.GetOrdinal("id")),
        FirstName = r.GetString(r.GetOrdinal("first_name")),
        LastName = r.GetString(r.GetOrdinal("last_name")),
        BirthYear = r.GetInt32(r.GetOrdinal("birth_year")),
        Gender = r.GetString(r.GetOrdinal("gender")),
        ClubName = r.IsDBNull(r.GetOrdinal("club_name")) ? null : r.GetString(r.GetOrdinal("club_name")),
        PhotoPath = r.IsDBNull(r.GetOrdinal("photo_path")) ? null : r.GetString(r.GetOrdinal("photo_path")),
        CreatedAt = r.GetString(r.GetOrdinal(CreatedAtKey)),
        UpdatedAt = r.GetString(r.GetOrdinal("updated_at")),
    };
    public Task<List<Athlete>> GetAthletesAsync() => QueryAsync("SELECT * FROM athletes ORDER BY id", ReadAthlete);
    private static async Task<Athlete> WriteAthleteAsync(SqliteConnection c, SqliteTransaction tx, Athlete value)
    {
        if (string.IsNullOrEmpty(value.CreatedAt))
        {
            value.CreatedAt = DateTime.UtcNow.ToString(TimestampFormat, System.Globalization.CultureInfo.InvariantCulture);
        }

        if (string.IsNullOrEmpty(value.UpdatedAt))
        {
            value.UpdatedAt = DateTime.UtcNow.ToString(TimestampFormat, System.Globalization.CultureInfo.InvariantCulture);
        }

        value.Id = await UpsertAsync(c, tx, "athletes", value.Id, ["first_name", "last_name", "birth_year", "gender", "club_name", "photo_path", CreatedAtKey, "updated_at"], [value.FirstName, value.LastName, value.BirthYear, value.Gender, value.ClubName, value.PhotoPath, value.CreatedAt, value.UpdatedAt]);
        return value;
    }

    public Task<Athlete> SaveAthleteAsync(Athlete value) => TransactionAsync((c, tx) => WriteAthleteAsync(c, tx, value));
    private static Discipline ReadDiscipline(SqliteDataReader r) => new()
    {
        Id = r.GetInt64(r.GetOrdinal("id")),
        Name = r.GetString(r.GetOrdinal("name")),
        FullName = r.GetString(r.GetOrdinal("full_name")),
        Category = r.GetString(r.GetOrdinal("category")),
        Unit = r.GetString(r.GetOrdinal("unit")),
        LowerIsBetter = r.GetBoolean(r.GetOrdinal("lower_is_better")),
        IconName = r.IsDBNull(r.GetOrdinal("icon_name")) ? null : r.GetString(r.GetOrdinal("icon_name")),
    };
    public Task<List<Discipline>> GetDisciplinesAsync() => QueryAsync("SELECT * FROM disciplines ORDER BY id", ReadDiscipline);
    private static Result ReadResult(SqliteDataReader r) => new()
    {
        Id = r.GetInt64(r.GetOrdinal("id")),
        AthleteId = r.GetInt64(r.GetOrdinal(AthleteIdKey)),
        DisciplineId = r.GetInt64(r.GetOrdinal(DisciplineIdKey)),
        Date = r.GetString(r.GetOrdinal("date")),
        Value = r.GetDouble(r.GetOrdinal("value")),
        Type = r.GetString(r.GetOrdinal("type")),
        CompetitionName = r.IsDBNull(r.GetOrdinal(CompetitionNameKey)) ? null : r.GetString(r.GetOrdinal(CompetitionNameKey)),
        CompetitionLevel = r.IsDBNull(r.GetOrdinal("competition_level")) ? null : r.GetString(r.GetOrdinal("competition_level")),
        CustomLevelName = r.IsDBNull(r.GetOrdinal(CustomLevelNameKey)) ? null : r.GetString(r.GetOrdinal(CustomLevelNameKey)),
        Location = r.IsDBNull(r.GetOrdinal(LocationKey)) ? null : r.GetString(r.GetOrdinal(LocationKey)),
        Placement = r.IsDBNull(r.GetOrdinal("placement")) ? null : r.GetInt32(r.GetOrdinal("placement")),
        Notes = r.IsDBNull(r.GetOrdinal(NotesKey)) ? null : r.GetString(r.GetOrdinal(NotesKey)),
        IsPersonalBest = r.GetBoolean(r.GetOrdinal("is_personal_best")),
        IsSeasonBest = r.GetBoolean(r.GetOrdinal("is_season_best")),
        IsNationalRecord = r.GetBoolean(r.GetOrdinal("is_national_record")),
        Wind = r.IsDBNull(r.GetOrdinal("wind")) ? null : r.GetDouble(r.GetOrdinal("wind")),
        Status = r.IsDBNull(r.GetOrdinal(StatusKey)) ? null : r.GetString(r.GetOrdinal(StatusKey)),
        EquipmentWeight = r.IsDBNull(r.GetOrdinal("equipment_weight")) ? null : r.GetDouble(r.GetOrdinal("equipment_weight")),
        HurdleHeight = r.IsDBNull(r.GetOrdinal("hurdle_height")) ? null : r.GetInt32(r.GetOrdinal("hurdle_height")),
        HurdleSpacing = r.IsDBNull(r.GetOrdinal("hurdle_spacing")) ? null : r.GetDouble(r.GetOrdinal("hurdle_spacing")),
        SubResults = r.IsDBNull(r.GetOrdinal("sub_results")) ? null : r.GetString(r.GetOrdinal("sub_results")),
        CombinedEventId = r.IsDBNull(r.GetOrdinal("combined_event_id")) ? null : r.GetInt64(r.GetOrdinal("combined_event_id")),
        CreatedAt = r.GetString(r.GetOrdinal(CreatedAtKey)),
    };
    public Task<List<Result>> GetResultsAsync(long? athleteId = null) => QueryAsync("SELECT * FROM results WHERE ($filter IS NULL OR athlete_id=$filter) ORDER BY id", ReadResult, (FilterParameter, athleteId));
    private static async Task<Result> WriteResultAsync(SqliteConnection c, SqliteTransaction tx, Result value)
    {
        if (string.IsNullOrEmpty(value.CreatedAt))
        {
            value.CreatedAt = DateTime.UtcNow.ToString(TimestampFormat, System.Globalization.CultureInfo.InvariantCulture);
        }

        value.Id = await UpsertAsync(c, tx, "results", value.Id, [AthleteIdKey, DisciplineIdKey, "date", "value", "type", CompetitionNameKey, "competition_level", CustomLevelNameKey, LocationKey, "placement", NotesKey, "is_personal_best", "is_season_best", "is_national_record", "wind", StatusKey, "equipment_weight", "hurdle_height", "hurdle_spacing", "sub_results", "combined_event_id", CreatedAtKey], [value.AthleteId, value.DisciplineId, value.Date, value.Value, value.Type, value.CompetitionName, value.CompetitionLevel, value.CustomLevelName, value.Location, value.Placement, value.Notes, value.IsPersonalBest, value.IsSeasonBest, value.IsNationalRecord, value.Wind, value.Status, value.EquipmentWeight, value.HurdleHeight, value.HurdleSpacing, value.SubResults, value.CombinedEventId, value.CreatedAt]);
        return value;
    }

    private static Competition ReadCompetition(SqliteDataReader r) => new()
    {
        Id = r.GetInt64(r.GetOrdinal("id")),
        Name = r.GetString(r.GetOrdinal("name")),
        Date = r.GetString(r.GetOrdinal("date")),
        EndDate = r.IsDBNull(r.GetOrdinal("end_date")) ? null : r.GetString(r.GetOrdinal("end_date")),
        Location = r.IsDBNull(r.GetOrdinal(LocationKey)) ? null : r.GetString(r.GetOrdinal(LocationKey)),
        Address = r.IsDBNull(r.GetOrdinal("address")) ? null : r.GetString(r.GetOrdinal("address")),
        Level = r.IsDBNull(r.GetOrdinal("level")) ? null : r.GetString(r.GetOrdinal("level")),
        CustomLevelName = r.IsDBNull(r.GetOrdinal(CustomLevelNameKey)) ? null : r.GetString(r.GetOrdinal(CustomLevelNameKey)),
        Notes = r.IsDBNull(r.GetOrdinal(NotesKey)) ? null : r.GetString(r.GetOrdinal(NotesKey)),
        ReminderEnabled = r.GetBoolean(r.GetOrdinal("reminder_enabled")),
        ReminderDaysBefore = r.IsDBNull(r.GetOrdinal("reminder_days_before")) ? null : r.GetInt32(r.GetOrdinal("reminder_days_before")),
        CreatedAt = r.GetString(r.GetOrdinal(CreatedAtKey)),
    };
    public Task<List<Competition>> GetCompetitionsAsync() => QueryAsync("SELECT * FROM competitions ORDER BY id", ReadCompetition);
    private static async Task<Competition> WriteCompetitionAsync(SqliteConnection c, SqliteTransaction tx, Competition value)
    {
        if (string.IsNullOrEmpty(value.CreatedAt))
        {
            value.CreatedAt = DateTime.UtcNow.ToString(TimestampFormat, System.Globalization.CultureInfo.InvariantCulture);
        }

        value.Id = await UpsertAsync(c, tx, "competitions", value.Id, ["name", "date", "end_date", LocationKey, "address", "level", CustomLevelNameKey, NotesKey, "reminder_enabled", "reminder_days_before", CreatedAtKey], [value.Name, value.Date, value.EndDate, value.Location, value.Address, value.Level, value.CustomLevelName, value.Notes, value.ReminderEnabled, value.ReminderDaysBefore, value.CreatedAt]);
        return value;
    }

    private static CompetitionParticipant ReadCompetitionParticipant(SqliteDataReader r) => new()
    {
        Id = r.GetInt64(r.GetOrdinal("id")),
        CompetitionId = r.GetInt64(r.GetOrdinal(CompetitionIdKey)),
        AthleteId = r.GetInt64(r.GetOrdinal(AthleteIdKey)),
        DisciplinesPlanned = r.IsDBNull(r.GetOrdinal("disciplines_planned")) ? null : JsonSerializer.Deserialize<List<long>>(r.GetString(r.GetOrdinal("disciplines_planned"))),
    };
    public Task<List<CompetitionParticipant>> GetParticipantsAsync(long? competitionId = null) => QueryAsync("SELECT * FROM competition_participants WHERE ($filter IS NULL OR competition_id=$filter) ORDER BY id", ReadCompetitionParticipant, (FilterParameter, competitionId));
    private static async Task<CompetitionParticipant> WriteCompetitionParticipantAsync(SqliteConnection c, SqliteTransaction tx, CompetitionParticipant value)
    {
        value.Id = await UpsertAsync(c, tx, "competition_participants", value.Id, [CompetitionIdKey, AthleteIdKey, "disciplines_planned"], [value.CompetitionId, value.AthleteId, value.DisciplinesPlanned is null ? null : JsonSerializer.Serialize(value.DisciplinesPlanned)]);
        return value;
    }

    public Task<CompetitionParticipant> SaveCompetitionParticipantAsync(CompetitionParticipant value) => TransactionAsync((c, tx) => WriteCompetitionParticipantAsync(c, tx, value));
    public Task DeleteCompetitionParticipantAsync(long id) => DeleteSimpleAsync("competition_participants", id);
    private static Goal ReadGoal(SqliteDataReader r) => new()
    {
        Id = r.GetInt64(r.GetOrdinal("id")),
        AthleteId = r.GetInt64(r.GetOrdinal(AthleteIdKey)),
        DisciplineId = r.GetInt64(r.GetOrdinal(DisciplineIdKey)),
        TargetValue = r.GetDouble(r.GetOrdinal("target_value")),
        TargetDate = r.IsDBNull(r.GetOrdinal("target_date")) ? null : r.GetString(r.GetOrdinal("target_date")),
        Status = r.GetString(r.GetOrdinal(StatusKey)),
        AchievedAt = r.IsDBNull(r.GetOrdinal("achieved_at")) ? null : r.GetString(r.GetOrdinal("achieved_at")),
        CreatedAt = r.GetString(r.GetOrdinal(CreatedAtKey)),
    };
    public Task<List<Goal>> GetGoalsAsync(long? athleteId = null) => QueryAsync("SELECT * FROM goals WHERE ($filter IS NULL OR athlete_id=$filter) ORDER BY id", ReadGoal, (FilterParameter, athleteId));
    private static async Task<Goal> WriteGoalAsync(SqliteConnection c, SqliteTransaction tx, Goal value)
    {
        if (string.IsNullOrEmpty(value.CreatedAt))
        {
            value.CreatedAt = DateTime.UtcNow.ToString(TimestampFormat, System.Globalization.CultureInfo.InvariantCulture);
        }

        value.Id = await UpsertAsync(c, tx, "goals", value.Id, [AthleteIdKey, DisciplineIdKey, "target_value", "target_date", StatusKey, "achieved_at", CreatedAtKey], [value.AthleteId, value.DisciplineId, value.TargetValue, value.TargetDate, value.Status, value.AchievedAt, value.CreatedAt]);
        return value;
    }

    public Task<Goal> SaveGoalAsync(Goal value) => TransactionAsync((c, tx) => WriteGoalAsync(c, tx, value));
    public Task DeleteGoalAsync(long id) => DeleteSimpleAsync("goals", id);
    private static Medal ReadMedal(SqliteDataReader r) => new()
    {
        Id = r.GetInt64(r.GetOrdinal("id")),
        AthleteId = r.GetInt64(r.GetOrdinal(AthleteIdKey)),
        ResultId = r.IsDBNull(r.GetOrdinal("result_id")) ? null : r.GetInt64(r.GetOrdinal("result_id")),
        Type = r.GetString(r.GetOrdinal("type")),
        CompetitionName = r.GetString(r.GetOrdinal(CompetitionNameKey)),
        CompetitionId = r.IsDBNull(r.GetOrdinal(CompetitionIdKey)) ? null : r.GetInt64(r.GetOrdinal(CompetitionIdKey)),
        Location = r.IsDBNull(r.GetOrdinal(LocationKey)) ? null : r.GetString(r.GetOrdinal(LocationKey)),
        DisciplineId = r.IsDBNull(r.GetOrdinal(DisciplineIdKey)) ? null : r.GetInt64(r.GetOrdinal(DisciplineIdKey)),
        DisciplineName = r.IsDBNull(r.GetOrdinal("discipline_name")) ? null : r.GetString(r.GetOrdinal("discipline_name")),
        Date = r.GetString(r.GetOrdinal("date")),
        CreatedAt = r.GetString(r.GetOrdinal(CreatedAtKey)),
    };
    public Task<List<Medal>> GetMedalsAsync(long? athleteId = null) => QueryAsync("SELECT * FROM medals WHERE ($filter IS NULL OR athlete_id=$filter) ORDER BY id", ReadMedal, (FilterParameter, athleteId));
    private static async Task<Medal> WriteMedalAsync(SqliteConnection c, SqliteTransaction tx, Medal value)
    {
        if (string.IsNullOrEmpty(value.CreatedAt))
        {
            value.CreatedAt = DateTime.UtcNow.ToString(TimestampFormat, System.Globalization.CultureInfo.InvariantCulture);
        }

        value.Id = await UpsertAsync(c, tx, "medals", value.Id, [AthleteIdKey, "result_id", "type", CompetitionNameKey, CompetitionIdKey, LocationKey, DisciplineIdKey, "discipline_name", "date", CreatedAtKey], [value.AthleteId, value.ResultId, value.Type, value.CompetitionName, value.CompetitionId, value.Location, value.DisciplineId, value.DisciplineName, value.Date, value.CreatedAt]);
        return value;
    }

    public Task<Medal> SaveMedalAsync(Medal value) => TransactionAsync((c, tx) => WriteMedalAsync(c, tx, value));
    public Task DeleteMedalAsync(long id) => DeleteSimpleAsync("medals", id);
    private static Photo ReadPhoto(SqliteDataReader r) => new()
    {
        Id = r.GetInt64(r.GetOrdinal("id")),
        EntityType = r.GetString(r.GetOrdinal("entity_type")),
        EntityId = r.GetInt64(r.GetOrdinal("entity_id")),
        FilePath = r.GetString(r.GetOrdinal("file_path")),
        ThumbnailPath = r.IsDBNull(r.GetOrdinal("thumbnail_path")) ? null : r.GetString(r.GetOrdinal("thumbnail_path")),
        OriginalName = r.GetString(r.GetOrdinal("original_name")),
        Width = r.IsDBNull(r.GetOrdinal("width")) ? null : r.GetInt32(r.GetOrdinal("width")),
        Height = r.IsDBNull(r.GetOrdinal("height")) ? null : r.GetInt32(r.GetOrdinal("height")),
        SizeBytes = r.GetInt64(r.GetOrdinal("size_bytes")),
        EventName = r.IsDBNull(r.GetOrdinal("event_name")) ? null : r.GetString(r.GetOrdinal("event_name")),
        CreatedAt = r.GetString(r.GetOrdinal(CreatedAtKey)),
    };
    public Task<List<Photo>> GetPhotosAsync(string? entityType = null, long? entityId = null) => QueryAsync("SELECT * FROM photos WHERE ($type IS NULL OR entity_type=$type) AND ($filter IS NULL OR entity_id=$filter) ORDER BY id", ReadPhoto, ("$type", entityType), (FilterParameter, entityId));
    private static async Task<Photo> WritePhotoAsync(SqliteConnection c, SqliteTransaction tx, Photo value)
    {
        if (string.IsNullOrEmpty(value.CreatedAt))
        {
            value.CreatedAt = DateTime.UtcNow.ToString(TimestampFormat, System.Globalization.CultureInfo.InvariantCulture);
        }

        value.Id = await UpsertAsync(c, tx, "photos", value.Id, ["entity_type", "entity_id", "file_path", "thumbnail_path", "original_name", "width", "height", "size_bytes", "event_name", CreatedAtKey], [value.EntityType, value.EntityId, value.FilePath, value.ThumbnailPath, value.OriginalName, value.Width, value.Height, value.SizeBytes, value.EventName, value.CreatedAt]);
        return value;
    }
}
