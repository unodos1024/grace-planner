using GracePlanner.Api.Data;
using GracePlanner.Api.Repositories;
using GracePlanner.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Oracle Wallet Setup
var walletPath = Path.Combine(builder.Environment.ContentRootPath, "oracle_wallet");
Environment.SetEnvironmentVariable("TNS_ADMIN", walletPath);

// Database Configuration (Oracle)
var connectionString = builder.Configuration.GetConnectionString("OracleDb");
builder.Services.AddDbContext<GracePlannerContext>(options =>
    options.UseOracle(connectionString));

// Register ADO.NET Data Service
builder.Services.AddScoped<IOracleDataService, OracleDataService>();

// Dependency Injection
builder.Services.AddScoped<IDailyTaskRepository, DailyTaskRepository>();
builder.Services.AddScoped<IBibleRepository, BibleRepository>();
builder.Services.AddScoped<ISermonRepository, SermonRepository>();
builder.Services.AddScoped<IBookRepository, BookRepository>();

builder.Services.AddScoped<IHomeService, HomeService>();
builder.Services.AddScoped<IPrayerService, PrayerService>();
builder.Services.AddScoped<IQtService, QtService>();
builder.Services.AddScoped<IMemoryVerseService, MemoryVerseService>();
builder.Services.AddScoped<IBibleService, BibleService>();

// CORS (For Mobile/Web App Local Test)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder => builder.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

app.Run();
