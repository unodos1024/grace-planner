using GracePlanner.Api.Models.Entities;
using GracePlanner.Api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace GracePlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SermonController : ControllerBase
    {
        private readonly ISermonRepository _repository;
        private readonly IDailyTaskRepository _taskRepository;

        public SermonController(ISermonRepository repository, IDailyTaskRepository taskRepository)
        {
            _repository = repository;
            _taskRepository = taskRepository;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _repository.GetAllAsync());
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] SermonNote note)
        {
            note.CreatedDate = note.CreatedDate == default ? DateTime.Now : note.CreatedDate;
            await _repository.CreateAsync(note);

            // 오늘의 과제로 자동 등록
            await _taskRepository.UpsertTaskAsync(new DailyTask
            {
                TaskDate = DateTime.Now,
                TaskType = "SERMON",
                Completed = "Y"
            });

            return Ok(note);
        }
    }
}
