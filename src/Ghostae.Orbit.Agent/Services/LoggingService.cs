using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Ghostae.Orbit.Agent.Models;

namespace Ghostae.Orbit.Agent.Services
{
    public class LoggingService
    {
        private static readonly Lazy<LoggingService> _instance = new(() => new LoggingService());
        public static LoggingService Instance => _instance.Value;

        private readonly BlockingCollection<LogEntry> _fileWriteQueue = new(new ConcurrentQueue<LogEntry>(), 2000);

        public LoggingService()
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            var logDir = Path.Combine(appData, "GhostaeOrbit", "logs");
            Directory.CreateDirectory(logDir);
            _logFilePath = Path.Combine(logDir, "orbit_agent.log");

            Task.Run(ProcessLogWriteQueue);
        }

        private void ProcessLogWriteQueue()
        {
            foreach (var entry in _fileWriteQueue.GetConsumingEnumerable())
            {
                try
                {
                    lock (_fileLock)
                    {
                        var line = $"[{entry.Timestamp:yyyy-MM-dd HH:mm:ss.fff}] [{entry.Level}] [{entry.Category}] {entry.Message}{(string.IsNullOrEmpty(entry.Details) ? "" : " | " + entry.Details)}{Environment.NewLine}";
                        File.AppendAllText(_logFilePath, line);
                    }
                }
                catch
                {
                    // Ignore background log write errors
                }
            }
        }

        public void Log(LogCategory category, string level, string message, string? details = null)
        {
            var entry = new LogEntry
            {
                Timestamp = DateTime.Now,
                Category = category,
                Level = level,
                Message = message,
                Details = details
            };

            _logs.Enqueue(entry);
            while (_logs.Count > _maxInMemory)
            {
                _logs.TryDequeue(out _);
            }

            _fileWriteQueue.TryAdd(entry);
            OnLogAdded?.Invoke(entry);
        }

        public void Info(LogCategory category, string message, string? details = null) => Log(category, "INFO", message, details);
        public void Success(LogCategory category, string message, string? details = null) => Log(category, "SUCCESS", message, details);
        public void Warn(LogCategory category, string message, string? details = null) => Log(category, "WARN", message, details);
        public void Error(LogCategory category, string message, string? details = null) => Log(category, "ERROR", message, details);

        public IReadOnlyList<LogEntry> GetAllLogs() => _logs.ToArray();

        public IReadOnlyList<LogEntry> GetLogsByCategory(LogCategory? category)
        {
            if (category == null) return _logs.ToArray();
            return _logs.Where(l => l.Category == category.Value).ToArray();
        }

        public string GetLogFilePath() => _logFilePath;

        public void Clear()
        {
            while (_logs.TryDequeue(out _)) { }
        }
    }
}
