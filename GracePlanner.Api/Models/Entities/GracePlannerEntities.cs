using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GracePlanner.Api.Models.Entities
{
    [Table("DAILY_TASKS")]
    public class DailyTask
    {
        [Key]
        [Column("TASK_ID")]
        public int TaskId { get; set; }

        [Column("USER_ID")]
        public int UserId { get; set; } = 1;

        [Column("TASK_DATE")]
        public DateTime TaskDate { get; set; }

        [Column("TASK_TYPE")]
        [Required]
        [MaxLength(20)]
        public string TaskType { get; set; } = string.Empty;

        [Column("COMPLETED")]
        [MaxLength(1)]
        public string Completed { get; set; } = "N";

        [Column("DURATION")]
        public int Duration { get; set; }

        [Column("CREATED_AT")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }

    [Table("BIBLE_READING_90")]
    public class BibleReading90
    {
        [Key]
        [Column("DAY_INDEX")]
        public int DayIndex { get; set; }

        [Column("PERIOD_TYPE")]
        [Required]
        [MaxLength(10)]
        public string PeriodType { get; set; } = string.Empty;

        [Column("COMPLETED_DATE")]
        public DateTime? CompletedDate { get; set; }

        [Column("USER_ID")]
        public int UserId { get; set; } = 1;
    }

    [Table("SERMON_NOTES")]
    public class SermonNote
    {
        [Key]
        [Column("NOTE_ID")]
        public int NoteId { get; set; }

        [Column("WORSHIP_TYPE")]
        [Required]
        [MaxLength(20)]
        public string WorshipType { get; set; } = string.Empty;

        [Column("TITLE")]
        [Required]
        [MaxLength(100)]
        public string Title { get; set; } = string.Empty;

        [Column("CONTENT")]
        public string? Content { get; set; }

        [Column("CREATED_DATE")]
        public DateTime CreatedDate { get; set; }

        [Column("CREATED_AT")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }

    [Table("BOOK_REVIEWS")]
    public class BookReview
    {
        [Key]
        [Column("REVIEW_ID")]
        public int ReviewId { get; set; }

        [Column("BOOK_ID")]
        [Required]
        [MaxLength(50)]
        public string BookId { get; set; } = string.Empty;

        [Column("CONTENT")]
        public string? Content { get; set; }

        [Column("CREATED_DATE")]
        public DateTime CreatedDate { get; set; }

        [Column("CREATED_AT")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
