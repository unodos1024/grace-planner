namespace GracePlanner.Api.Models.DTOs
{
    public class TodaySummaryDto
    {
        public DateTime Date { get; set; }
        public string DayOfWeek { get; set; } = string.Empty;
        public List<TaskItemDto> Tasks { get; set; } = new();
        public WeeklyProgressDto WeeklyProgress { get; set; } = new();
    }

    public class TaskItemDto
    {
        public string Type { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool IsCompleted { get; set; }
        public int? Duration { get; set; }
        public object? Metadata { get; set; }
    }

    public class WeeklyProgressDto
    {
        public int QtCount { get; set; }
        public int PrayerTotalMinutes { get; set; }
        public int BibleReadCount { get; set; }
        public double Percentage { get; set; }
        public List<DailyStatusDto> DailyStatuses { get; set; } = new();
    }

    public class DailyStatusDto
    {
        public DateTime Date { get; set; }
        public bool Prayer { get; set; }
        public int PrayerDuration { get; set; }
        public bool Qt { get; set; }
        public bool Bible { get; set; }
    }

    public class PrayerLogRequestDto
    {
        public int Minutes { get; set; }
        public DateTime Date { get; set; }
    }

    public class QtCheckRequestDto
    {
        public DateTime Date { get; set; }
        public bool Completed { get; set; }
    }
}
