using GracePlanner.Api.Models.DTOs;
using GracePlanner.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace GracePlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HomeController : ControllerBase
    {
        private readonly IHomeService _homeService;
        private readonly ILogger<HomeController> _logger;

        public HomeController(IHomeService homeService, ILogger<HomeController> logger)
        {
            _homeService = homeService;
            _logger = logger;
        }

        [HttpGet("today")]
        public async Task<ActionResult<TodaySummaryDto>> GetToday()
        {
            try
            {
                // 실 서비스에서는 사용자 Context에서 날짜를 가져오거나 서버 시간을 기준으로 함
                var summary = await _homeService.GetTodaySummaryAsync(DateTime.Now);
                return Ok(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting today summary");
                return StatusCode(500, "Internal server error");
            }
        }
    }
}
