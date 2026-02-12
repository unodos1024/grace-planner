using GracePlanner.Api.Data;
using GracePlanner.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GracePlanner.Api.Repositories
{
    public interface IDailyTaskRepository
    {
        Task<DailyTask?> GetTaskAsync(DateTime date, string type);
        Task<List<DailyTask>> GetTasksByDateAsync(DateTime date);
        Task<List<DailyTask>> GetWeeklyTasksAsync(DateTime startDate, DateTime endDate);
        Task UpsertTaskAsync(DailyTask task);
    }

    public class DailyTaskRepository : IDailyTaskRepository
    {
        private readonly GracePlannerContext _context;

        public DailyTaskRepository(GracePlannerContext context)
        {
            _context = context;
        }

        public async Task<DailyTask?> GetTaskAsync(DateTime date, string type)
        {
            var targetDate = date.Date;
            return await _context.DailyTasks
                .FirstOrDefaultAsync(t => t.TaskDate == targetDate && t.TaskType == type);
        }

        public async Task<List<DailyTask>> GetTasksByDateAsync(DateTime date)
        {
            var targetDate = date.Date;
            return await _context.DailyTasks
                .Where(t => t.TaskDate == targetDate)
                .ToListAsync();
        }

        public async Task<List<DailyTask>> GetWeeklyTasksAsync(DateTime startDate, DateTime endDate)
        {
            return await _context.DailyTasks
                .Where(t => t.TaskDate >= startDate.Date && t.TaskDate <= endDate.Date)
                .ToListAsync();
        }

        public async Task UpsertTaskAsync(DailyTask task)
        {
            task.TaskDate = task.TaskDate.Date;
            var existing = await GetTaskAsync(task.TaskDate, task.TaskType);

            if (existing == null)
            {
                _context.DailyTasks.Add(task);
            }
            else
            {
                existing.Completed = task.Completed;
                existing.Duration = task.Duration;
                _context.DailyTasks.Update(existing);
            }

            await _context.SaveChangesAsync();
        }
    }
}
