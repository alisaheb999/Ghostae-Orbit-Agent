// Ghostae Orbit Premiere UXP Bridge
const AGENT_URL = "http://127.0.0.1:18920/orbit/bridge/";

async function reportToAgent() {
    let payload = {
        project_name: "Client_Project.prproj",
        version: "24.2.0",
        render_status: "Idle",
        active_sequence: "Main_Timeline"
    };

    try {
        // Query UXP Premiere DOM if in host environment
        if (typeof require !== "undefined") {
            try {
                const app = require("premierepro");
                if (app && app.project) {
                    payload.project_name = app.project.name || payload.project_name;
                    if (app.project.activeSequence) {
                        payload.active_sequence = app.project.activeSequence.name;
                    }
                }
            } catch (e) { }
        }

        const resp = await fetch(AGENT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                application: "premiere",
                command: "status_update",
                payload: payload
            })
        });

        if (resp.ok) {
            document.getElementById("agent-status").innerText = "Connected";
            document.getElementById("active-seq").innerText = payload.active_sequence;
        }
    } catch (e) {
        document.getElementById("agent-status").innerText = "Agent Offline";
    }
}

reportToAgent();
setInterval(reportToAgent, 5000);
