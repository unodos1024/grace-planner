using Oracle.ManagedDataAccess.Client;
using System.Data;

namespace GracePlanner.Api.Services
{
    /// <summary>
    /// Oracle Autonomous Database 연결 및 데이터 처리를 담당하는 서비스
    /// </summary>
    public interface IOracleDataService
    {
        /// <summary>
        /// SQL 쿼리를 실행하고 결과를 DataTable로 반환합니다.
        /// </summary>
        Task<DataTable> ExecuteQueryAsync(string sql, OracleParameter[]? parameters = null);

        /// <summary>
        /// SQL 명령(INSERT, UPDATE, DELETE)을 실행하고 영향받은 행의 수를 반환합니다.
        /// </summary>
        Task<int> ExecuteNonQueryAsync(string sql, OracleParameter[]? parameters = null);
    }

    public class OracleDataService : IOracleDataService
    {
        private readonly string _connectionString;
        private readonly ILogger<OracleDataService> _logger;

        public OracleDataService(IConfiguration configuration, ILogger<OracleDataService> logger)
        {
            _connectionString = configuration.GetConnectionString("OracleDb") 
                ?? throw new ArgumentNullException("OracleDb ConnectionString is missing");
            _logger = logger;
        }

        public async Task<DataTable> ExecuteQueryAsync(string sql, OracleParameter[]? parameters = null)
        {
            try
            {
                using (var connection = new OracleConnection(_connectionString))
                {
                    await connection.OpenAsync();
                    using (var command = new OracleCommand(sql, connection))
                    {
                        if (parameters != null)
                        {
                            command.Parameters.AddRange(parameters);
                        }

                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            var dataTable = new DataTable();
                            dataTable.Load(reader);
                            return dataTable;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing Oracle query: {Sql}", sql);
                throw;
            }
        }

        public async Task<int> ExecuteNonQueryAsync(string sql, OracleParameter[]? parameters = null)
        {
            try
            {
                using (var connection = new OracleConnection(_connectionString))
                {
                    await connection.OpenAsync();
                    using (var command = new OracleCommand(sql, connection))
                    {
                        if (parameters != null)
                        {
                            command.Parameters.AddRange(parameters);
                        }

                        return await command.ExecuteNonQueryAsync();
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing Oracle non-query: {Sql}", sql);
                throw;
            }
        }
    }
}
