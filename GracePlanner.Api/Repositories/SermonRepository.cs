using GracePlanner.Api.Data;
using GracePlanner.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GracePlanner.Api.Repositories
{
    public interface ISermonRepository
    {
        Task<List<SermonNote>> GetAllAsync();
        Task<SermonNote?> GetByIdAsync(int id);
        Task CreateAsync(SermonNote note);
    }

    public class SermonRepository : ISermonRepository
    {
        private readonly GracePlannerContext _context;

        public SermonRepository(GracePlannerContext context)
        {
            _context = context;
        }

        public async Task<List<SermonNote>> GetAllAsync()
        {
            return await _context.SermonNotes.OrderByDescending(s => s.CreatedDate).ToListAsync();
        }

        public async Task<SermonNote?> GetByIdAsync(int id)
        {
            return await _context.SermonNotes.FindAsync(id);
        }

        public async Task CreateAsync(SermonNote note)
        {
            _context.SermonNotes.Add(note);
            await _context.SaveChangesAsync();
        }
    }
}
