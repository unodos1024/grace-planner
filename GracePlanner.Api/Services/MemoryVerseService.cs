using System.Text.Json;
using GracePlanner.Api.Models.DTOs;

namespace GracePlanner.Api.Services
{
    public interface IMemoryVerseService
    {
        Task<List<VerseVolumeDto>> GetAllVersesAsync();
        Task<VerseDto?> GetVerseByIdAsync(string id);
    }

    public class MemoryVerseService : IMemoryVerseService
    {
        private readonly string _filePath;
        private static List<VerseVolumeDto>? _cachedVerses;

        public MemoryVerseService(IWebHostEnvironment env)
        {
            _filePath = Path.Combine(env.ContentRootPath, "SeedData", "verses.json");
        }

        public async Task<List<VerseVolumeDto>> GetAllVersesAsync()
        {
            if (_cachedVerses != null) return _cachedVerses;

            if (!File.Exists(_filePath)) return new List<VerseVolumeDto>();

            var json = await File.ReadAllTextAsync(_filePath);
            _cachedVerses = JsonSerializer.Deserialize<List<VerseVolumeDto>>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            return _cachedVerses ?? new List<VerseVolumeDto>();
        }

        public async Task<VerseDto?> GetVerseByIdAsync(string id)
        {
            var volumes = await GetAllVersesAsync();
            return volumes.SelectMany(v => v.Verses).FirstOrDefault(v => v.Id == id);
        }
    }

    // DTOs for Verses
    public class VerseVolumeDto
    {
        public int Volume { get; set; }
        public string VolumeTitle { get; set; } = string.Empty;
        public List<VerseDto> Verses { get; set; } = new();
    }

    public class VerseDto
    {
        public string Id { get; set; } = string.Empty;
        public string Lesson { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Reference { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
        public string ReferenceEn { get; set; } = string.Empty;
        public string TextEn { get; set; } = string.Empty;
    }
}
