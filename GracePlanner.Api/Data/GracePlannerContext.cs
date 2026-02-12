using Microsoft.EntityFrameworkCore;
using GracePlanner.Api.Models.Entities;

namespace GracePlanner.Api.Data
{
    public class GracePlannerContext : DbContext
    {
        public GracePlannerContext(DbContextOptions<GracePlannerContext> options) : base(options)
        {
        }

        public DbSet<DailyTask> DailyTasks { get; set; }
        public DbSet<BibleReading90> BibleReadings { get; set; }
        public DbSet<SermonNote> SermonNotes { get; set; }
        public DbSet<BookReview> BookReviews { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Oracle specific configurations if any
            modelBuilder.Entity<DailyTask>()
                .Property(t => t.Completed)
                .HasConversion(
                    v => v == "Y" ? 'Y' : 'N',
                    v => v == 'Y' ? "Y" : "N"
                );
        }
    }
}
