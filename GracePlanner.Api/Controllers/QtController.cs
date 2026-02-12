using GracePlanner.Api.Models.DTOs;
using GracePlanner.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace GracePlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class QtController : ControllerBase
    {
        private readonly IQtService _qtService;

        public QtController(IQtService qtService)
        {
            _qtService = qtService;
        }

        [HttpPost("check")]
        public async Task<IActionResult> Check([FromBody] QtCheckRequestDto request)
        {
            await _qtService.CheckQtAsync(request.Date, request.Completed);
            return Ok();
        }

        [HttpGet("weekly")]
        public async Task<IActionResult> GetWeekly([FromQuery] DateTime? date)
        {
            var targetDate = date ?? DateTime.Now;
            var summary = await _qtService.GetWeeklySummaryAsync(targetDate);
            return Ok(summary);
        }
    }
}
