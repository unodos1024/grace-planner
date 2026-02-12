using GracePlanner.Api.Models.DTOs;
using GracePlanner.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace GracePlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PrayerController : ControllerBase
    {
        private readonly IPrayerService _prayerService;

        public PrayerController(IPrayerService prayerService)
        {
            _prayerService = prayerService;
        }

        [HttpPost("log")]
        public async Task<IActionResult> LogPrayer([FromBody] PrayerLogRequestDto request)
        {
            await _prayerService.LogPrayerAsync(request.Minutes, request.Date);
            return Ok();
        }

        // POST /api/prayer/start 등은 타이머 시작 시점 기록용으로 확장 가능
    }
}
