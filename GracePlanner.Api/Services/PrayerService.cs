using GracePlanner.Api.Models.DTOs;
using GracePlanner.Api.Models.Entities;
using GracePlanner.Api.Repositories;

namespace GracePlanner.Api.Services
{
    public interface IPrayerService
    {
        Task LogPrayerAsync(int minutes, DateTime date);
    }

    public class PrayerService : IPrayerService
    {
        private readonly IDailyTaskRepository _repository;

        public PrayerService(IDailyTaskRepository repository)
        {
            _repository = repository;
        }

        public async Task LogPrayerAsync(int minutes, DateTime date)
        {
            var existing = await _repository.GetTaskAsync(date, "PRAYER");
            
            var task = new DailyTask
            {
                TaskDate = date,
                TaskType = "PRAYER",
                Duration = (existing?.Duration ?? 0) + minutes,
                Completed = ((existing?.Duration ?? 0) + minutes) >= 20 ? "Y" : "N"
            };

            await _repository.UpsertTaskAsync(task);
        }
    }
}
