using GracePlanner.Api.Models.Entities;
using GracePlanner.Api.Repositories;

namespace GracePlanner.Api.Services
{
    public interface IBibleService
    {
        Task<object> GetStatusAsync(string periodType);
        Task CheckProgressAsync(int dayIndex, string periodType, bool completed);
    }

    public class BibleService : IBibleService
    {
        private readonly IBibleRepository _bibleRepository;
        private readonly IDailyTaskRepository _taskRepository;

        public BibleService(IBibleRepository bibleRepository, IDailyTaskRepository taskRepository)
        {
            _bibleRepository = bibleRepository;
            _taskRepository = taskRepository;
        }

        public async Task<object> GetStatusAsync(string periodType)
        {
            var readings = await _bibleRepository.GetStatusAsync(periodType);
            var completedCount = readings.Count(r => r.CompletedDate != null);

            return new
            {
                PeriodType = periodType,
                CompletedCount = completedCount,
                TotalCount = 90,
                Percentage = Math.Round((completedCount / 90.0) * 100, 1),
                Details = readings
            };
        }

        public async Task CheckProgressAsync(int dayIndex, string periodType, bool completed)
        {
            await _bibleRepository.UpdateProgressAsync(dayIndex, periodType, completed);

            // 오늘의 과제(BIBLE_90)로도 등록하여 홈 화면 연동
            await _taskRepository.UpsertTaskAsync(new DailyTask
            {
                TaskDate = DateTime.Now,
                TaskType = "BIBLE_90",
                Completed = completed ? "Y" : "N"
            });
        }
    }
}
