using GracePlanner.Api.Models.DTOs;
using GracePlanner.Api.Services;
using GracePlanner.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace GracePlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly GracePlannerContext _context;
        private readonly ILogger<UsersController> _logger;

        public UsersController(GracePlannerContext context, ILogger<UsersController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// 모든 사용자를 조회합니다. (MySQL)
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetUsers()
        {
            try
            {
                var users = await _context.Users
                    .Select(u => new UserDto
                    {
                        Id = u.UserId,
                        Name = u.Username
                    })
                    .ToListAsync();

                return Ok(users);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching users from MySQL DB");
                return StatusCode(500, "Internal server error occurred while fetching data.");
            }
        }
    }
}
