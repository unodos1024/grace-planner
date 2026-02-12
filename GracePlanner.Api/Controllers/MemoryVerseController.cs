using GracePlanner.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace GracePlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MemoryVerseController : ControllerBase
    {
        private readonly IMemoryVerseService _verseService;

        public MemoryVerseController(IMemoryVerseService verseService)
        {
            _verseService = verseService;
        }

        [HttpGet]
        public async Task<ActionResult<List<VerseVolumeDto>>> GetAll()
        {
            var verses = await _verseService.GetAllVersesAsync();
            return Ok(verses);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<VerseDto>> GetById(string id)
        {
            var verse = await _verseService.GetVerseByIdAsync(id);
            if (verse == null) return NotFound();
            return Ok(verse);
        }
    }
}
