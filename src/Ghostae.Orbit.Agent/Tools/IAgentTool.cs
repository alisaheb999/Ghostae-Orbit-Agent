using System;
using System.Threading;
using System.Threading.Tasks;
using Ghostae.Orbit.Agent.Models;

namespace Ghostae.Orbit.Agent.Tools
{
    public interface IAgentTool
    {
        string ToolName { get; }
        Task<CommandResponse> ExecuteAsync(CommandRequest request, IProgress<CommandResponse> progress, CancellationToken cancellationToken);
    }
}
