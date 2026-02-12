using GracePlanner.Api.Models.DTOs;
using GracePlanner.Api.Models.Entities;
using GracePlanner.Api.Repositories;

namespace GracePlanner.Api.Services
{
    public interface IQtService
    {
        Task CheckQtAsync(DateTime date, bool completed);
        Task<object> GetWeeklySummaryAsync(DateTime date);
    }

    public class QtService : IQtService
    {
        private readonly IDailyTaskRepository _repository;

        public QtService(IDailyTaskRepository repository)
        {
            _repository = repository;
        }

        public async Task CheckQtAsync(DateTime date, bool completed)
        {
            // 일요일인 경우 경고 처리를 하거나 앱단에서 제어
            if (date.DayOfWeek == DayOfWeek.Sunday)
            {
                // 로직상 일요일은 QT 제외일 수 있음
            }

            var task = new DailyTask
            {
                TaskDate = date,
                TaskType = "QT",
                Completed = completed ? "Y" : "N"
            };

            await _repository.UpsertTaskAsync(task);
        }

        public async Task<object> GetWeeklySummaryAsync(DateTime date)
        {
            int diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
            var start = date.AddDays(-1 * diff).Date;
            var end = start.AddDays(6).Date;

            var tasks = await _repository.GetWeeklyTasksAsync(start, end);
            var qtTasks = tasks.Where(t => t.TaskType == "QT").ToList();

            return new
            {
                StartOfWeek = start,
                Count = qtTasks.Count(t => t.Completed == "Y"),
                Target = 6,
                Details = qtTasks.Select(t => new { t.TaskDate, t.Completed })
            };
        }
    }
}
