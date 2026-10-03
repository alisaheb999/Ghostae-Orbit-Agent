/**
 * Premiere Pro Engine - ExtendScript for Adobe Premiere Pro
 */
var PPRO_Engine = (function() {
    return {
        getState: function() {
            var activeSeq = app.project ? app.project.activeSequence : null;
            if (!activeSeq) {
                return { comp_active: false, comp_name: "No Active Sequence", duration: 0.0, current_time: 0.0 };
            }
            return {
                comp_active: true,
                comp_name: activeSeq.name,
                duration: parseFloat(activeSeq.end) || 0.0,
                current_time: parseFloat(activeSeq.getPlayerPosition().seconds) || 0.0
            };
        },

        apply: function(filePath, presetType) {
            if (!app.project) {
                return { success: false, error: "No Premiere Pro project open." };
            }
            var activeSeq = app.project.activeSequence;
            if (!activeSeq) {
                return { success: false, error: "Please open an active Sequence in Premiere Pro first." };
            }

            var targetFile = new File(filePath);
            if (!targetFile.exists) {
                return { success: false, error: "File does not exist: " + filePath };
            }

            try {
                // Import file into project bin
                var imported = app.project.importFiles([filePath], false, app.project.getInsertionBin(), false);
                if (!imported) {
                    return { success: false, error: "Failed to import file into Premiere project." };
                }

                return { success: true, compName: activeSeq.name };
            } catch (err) {
                return { success: false, error: err.toString() };
            }
        }
    };
})();
