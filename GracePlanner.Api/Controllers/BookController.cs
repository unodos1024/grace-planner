using GracePlanner.Api.Models.Entities;
using GracePlanner.Api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace GracePlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BookController : ControllerBase
    {
        private readonly IBookRepository _repository;
        private readonly IDailyTaskRepository _taskRepository;

        public BookController(IBookRepository repository, IDailyTaskRepository taskRepository)
        {
            _repository = repository;
            _taskRepository = taskRepository;
        }

        [HttpGet("reviews")]
        public async Task<IActionResult> GetReviews()
        {
            return Ok(await _repository.GetAllReviewsAsync());
        }

        [HttpPost("review")]
        public async Task<IActionResult> CreateReview([FromBody] BookReview review)
        {
            review.CreatedDate = review.CreatedDate == default ? DateTime.Now : review.CreatedDate;
            await _repository.CreateReviewAsync(review);

            // 독서 과제 완료 처리 (연간 14권 달성 과정으로 기록 가능하도록 확장 가능)
            await _taskRepository.UpsertTaskAsync(new DailyTask
            {
                TaskDate = DateTime.Now,
                TaskType = "BOOK",
                Completed = "Y"
            });

            return Ok(review);
        }
    }
}
