using GracePlanner.Api.Models.DTOs;
using GracePlanner.Api.Services;
using Microsoft.AspNetCore.Mvc;
using System.Data;

namespace GracePlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly IOracleDataService _oracleDataService;
        private readonly ILogger<UsersController> _logger;

        public UsersController(IOracleDataService oracleDataService, ILogger<UsersController> logger)
        {
            _oracleDataService = oracleDataService;
            _logger = logger;
        }

        /// <summary>
        /// USERS 테이블의 모든 사용자를 조회합니다.
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetUsers()
        {
            try
            {
                string sql = "SELECT ID, NAME FROM USERS";
                DataTable dt = await _oracleDataService.ExecuteQueryAsync(sql);

                var users = new List<UserDto>();
                foreach (DataRow row in dt.Rows)
                {
                    users.Add(new UserDto
                    {
                        Id = Convert.ToInt32(row["ID"]),
                        Name = row["NAME"].ToString() ?? string.Empty
                    });
                }

                return Ok(users);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching users from Oracle DB");
                return StatusCode(500, "Internal server error occurred while fetching data.");
            }
        }
    }
}
