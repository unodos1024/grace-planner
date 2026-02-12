using GracePlanner.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace GracePlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BibleController : ControllerBase
    {
        private readonly IBibleService _bibleService;

        public BibleController(IBibleService bibleService)
        {
            _bibleService = bibleService;
        }

        [HttpGet("status/{periodType}")]
        public async Task<IActionResult> GetStatus(string periodType)
        {
            // periodType: FIRST or SECOND
            var status = await _bibleService.GetStatusAsync(periodType.ToUpper());
            return Ok(status);
        }

        [HttpPost("check")]
        public async Task<IActionResult> Check([FromBody] BibleCheckRequest request)
        {
            await _bibleService.CheckProgressAsync(request.DayIndex, request.PeriodType.ToUpper(), request.Completed);
            return Ok();
        }
    }

    public class BibleCheckRequest
    {
        public int DayIndex { get; set; }
        public string PeriodType { get; set; } = string.Empty;
        public bool Completed { get; set; }
    }
}
