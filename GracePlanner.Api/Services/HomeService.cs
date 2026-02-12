using GracePlanner.Api.Models.DTOs;
using GracePlanner.Api.Repositories;

namespace GracePlanner.Api.Services
{
    public interface IHomeService
    {
        Task<TodaySummaryDto> GetTodaySummaryAsync(DateTime date);
    }

    public class HomeService : IHomeService
    {
        private readonly IDailyTaskRepository _taskRepository;

        public HomeService(IDailyTaskRepository taskRepository)
        {
            _taskRepository = taskRepository;
        }

        public async Task<TodaySummaryDto> GetTodaySummaryAsync(DateTime date)
        {
            var todayTasks = await _taskRepository.GetTasksByDateAsync(date);
            
            // 주간 범위 계산 (월요일 기준)
            int diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
            var startOfWeek = date.AddDays(-1 * diff).Date;
            var endOfWeek = startOfWeek.AddDays(6).Date;
            
            var weeklyTasks = await _taskRepository.GetWeeklyTasksAsync(startOfWeek, endOfWeek);

            var summary = new TodaySummaryDto
            {
                Date = date.Date,
                DayOfWeek = date.ToString("dddd"),
                Tasks = BuildTaskItems(todayTasks),
                WeeklyProgress = CalculateWeeklyProgress(weeklyTasks)
            };

            return summary;
        }

        private List<TaskItemDto> BuildTaskItems(List<Models.Entities.DailyTask> tasks)
        {
            var taskTypes = new[] { "QT", "PRAYER", "BIBLE_90", "VERSE", "STUDY", "BOOK", "SERMON" };
            var result = new List<TaskItemDto>();

            foreach (var type in taskTypes)
            {
                var task = tasks.FirstOrDefault(t => t.TaskType == type);
                result.Add(new TaskItemDto
                {
                    Type = type,
                    Title = GetTitleByType(type),
                    Description = GetDescriptionByType(type, task),
                    IsCompleted = task?.Completed == "Y",
                    Duration = task?.Duration
                });
            }

            return result;
        }

        private WeeklyProgressDto CalculateWeeklyProgress(List<Models.Entities.DailyTask> weeklyTasks)
        {
            var qtCount = weeklyTasks.Count(t => t.TaskType == "QT" && t.Completed == "Y");
            var prayerMins = weeklyTasks.Where(t => t.TaskType == "PRAYER").Sum(t => t.Duration);
            var bibleCount = weeklyTasks.Count(t => t.TaskType == "BIBLE_90" && t.Completed == "Y");

            // 전체 달성률
            double totalTarget = 6 + 7 + 7; 
            double currentAchieved = qtCount + (prayerMins >= 140 ? 7 : (prayerMins / 20.0)) + bibleCount; 

            // 일별 상태 요약 (월~일)
            var dailyStatuses = new List<DailyStatusDto>();
            var startOfWeek = weeklyTasks.Any() ? weeklyTasks.Min(t => t.TaskDate).Date : DateTime.Today.AddDays(-(int)DateTime.Today.DayOfWeek + (int)DayOfWeek.Monday).Date;
            
            for (int i = 0; i < 7; i++)
            {
                var curDate = startOfWeek.AddDays(i);
                var dayTasks = weeklyTasks.Where(t => t.TaskDate.Date == curDate).ToList();
                dailyStatuses.Add(new DailyStatusDto
                {
                    Date = curDate,
                    Prayer = dayTasks.Any(t => t.TaskType == "PRAYER" && t.Completed == "Y"),
                    PrayerDuration = dayTasks.Where(t => t.TaskType == "PRAYER").Sum(t => t.Duration),
                    Qt = dayTasks.Any(t => t.TaskType == "QT" && t.Completed == "Y"),
                    Bible = dayTasks.Any(t => t.TaskType == "BIBLE_90" && t.Completed == "Y")
                });
            }

            return new WeeklyProgressDto
            {
                QtCount = qtCount,
                PrayerTotalMinutes = prayerMins,
                BibleReadCount = bibleCount,
                Percentage = Math.Min(100, Math.Round((currentAchieved / totalTarget) * 100, 1)),
                DailyStatuses = dailyStatuses
            };
        }

        private string GetTitleByType(string type) => type switch
        {
            "QT" => "오늘의 QT",
            "PRAYER" => "기도 20분",
            "BIBLE_90" => "성경일기 (90일 통독)",
            "VERSE" => "성경 암송",
            "STUDY" => "교재 예습",
            "BOOK" => "독서",
            "SERMON" => "설교 요약",
            _ => type
        };

        private string GetDescriptionByType(string type, Models.Entities.DailyTask? task) => type switch
        {
            "QT" => "말씀으로 시작하는 하루",
            "PRAYER" => task?.Duration >= 20 ? "목표 달성!" : "골방에서의 깊은 대화",
            "BIBLE_90" => "말씀의 길을 걷는 중",
            _ => ""
        };
    }
}
