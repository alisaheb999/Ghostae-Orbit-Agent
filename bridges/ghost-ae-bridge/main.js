// Ghost AE Bridge Client
const AGENT_BRIDGE_URL = "http://127.0.0.1:18920/orbit/bridge/";

async function reportStatusToAgent() {
    try {
        let csInterface = window.__adobe_cep__ ? new CSInterface() : null;
        let projectData = { project_name: "Client_Project.aep", version: "24.0.0", render_status: "Idle" };

        if (csInterface) {
            csInterface.evalScript("getProjectStatus()", function(result) {
                try {
                    let parsed = JSON.parse(result);
                    sendPayload(parsed);
                } catch (e) {
                    sendPayload(projectData);
                }
            });
        } else {
            sendPayload(projectData);
        }
    } catch (e) {
        console.error("Bridge report error:", e);
    }
}

function sendPayload(data) {
    fetch(AGENT_BRIDGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            application: "after_effects",
            command: "status_update",
            payload: data
        })
    }).then(() => {
        document.getElementById("status-text").innerText = "Connected to Orbit Agent";
        document.getElementById("project-info").innerText = "Active: " + (data.project_name || "None");
    }).catch(err => {
        document.getElementById("status-text").innerText = "Agent Offline";
    });
}

// Initial report & periodic ping
reportStatusToAgent();
setInterval(reportStatusToAgent, 5000);
