using GracePlanner.Api.Data;
using GracePlanner.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GracePlanner.Api.Repositories
{
    public interface IBookRepository
    {
        Task<List<BookReview>> GetAllReviewsAsync();
        Task CreateReviewAsync(BookReview review);
    }

    public class BookRepository : IBookRepository
    {
        private readonly GracePlannerContext _context;

        public BookRepository(GracePlannerContext context)
        {
            _context = context;
        }

        public async Task<List<BookReview>> GetAllReviewsAsync()
        {
            return await _context.BookReviews.OrderByDescending(r => r.CreatedDate).ToListAsync();
        }

        public async Task CreateReviewAsync(BookReview review)
        {
            _context.BookReviews.Add(review);
            await _context.SaveChangesAsync();
        }
    }
}
