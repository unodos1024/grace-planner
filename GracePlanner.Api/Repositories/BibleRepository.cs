using GracePlanner.Api.Data;
using GracePlanner.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GracePlanner.Api.Repositories
{
    public interface IBibleRepository
    {
        Task<List<BibleReading90>> GetStatusAsync(string periodType);
        Task UpdateProgressAsync(int dayIndex, string periodType, bool completed);
    }

    public class BibleRepository : IBibleRepository
    {
        private readonly GracePlannerContext _context;

        public BibleRepository(GracePlannerContext context)
        {
            _context = context;
        }

        public async Task<List<BibleReading90>> GetStatusAsync(string periodType)
        {
            return await _context.BibleReadings
                .Where(b => b.PeriodType == periodType)
                .OrderBy(b => b.DayIndex)
                .ToListAsync();
        }

        public async Task UpdateProgressAsync(int dayIndex, string periodType, bool completed)
        {
            var existing = await _context.BibleReadings
                .FirstOrDefaultAsync(b => b.DayIndex == dayIndex && b.PeriodType == periodType);

            if (existing == null)
            {
                _context.BibleReadings.Add(new BibleReading90
                {
                    DayIndex = dayIndex,
                    PeriodType = periodType,
                    CompletedDate = completed ? DateTime.Now : null
                });
            }
            else
            {
                existing.CompletedDate = completed ? DateTime.Now : null;
                _context.BibleReadings.Update(existing);
            }

            await _context.SaveChangesAsync();
        }
    }
}
