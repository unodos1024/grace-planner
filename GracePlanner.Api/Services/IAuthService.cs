using GracePlanner.Api.Models.DTOs;
using GracePlanner.Api.Models.Entities;

namespace GracePlanner.Api.Services
{
    public interface IAuthService
    {
        string HashPassword(string password);
        bool VerifyPassword(string password, string hash);
        string CreateToken(User user);
    }
}
