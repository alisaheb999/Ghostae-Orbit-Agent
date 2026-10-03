/**
 * AE Engine - ExtendScript for Adobe After Effects
 */
var AE_Engine = (function() {
    function getActiveComp() {
        if (app.project && app.project.activeItem && (app.project.activeItem instanceof CompItem)) {
            return app.project.activeItem;
        }
        return null;
    }

    return {
        getState: function() {
            var comp = getActiveComp();
            if (!comp) {
                return { comp_active: false, comp_name: "No Active Composition", duration: 0.0, current_time: 0.0 };
            }
            return {
                comp_active: true,
                comp_name: comp.name,
                duration: comp.duration,
                current_time: comp.time
            };
        },

        apply: function(filePath, presetType) {
            if (!app.project) {
                return { success: false, error: "No After Effects project open." };
            }
            var comp = getActiveComp();
            if (!comp) {
                return { success: false, error: "Please open and select a Composition first." };
            }

            var targetFile = new File(filePath);
            if (!targetFile.exists && presetType !== "TEXT_V2") {
                return { success: false, error: "Preset or media file not found on disk: " + filePath };
            }

            app.beginUndoGroup("Creative Hub: " + presetType);
            try {
                if (presetType === "FFX_PRESET") {
                    var selectedLayers = comp.selectedLayers;
                    if (selectedLayers.length === 0) {
                        // Create adjustment layer if no layer selected
                        var adj = comp.layers.addSolid([1, 1, 1], "Hub Preset Layer", comp.width, comp.height, comp.pixelAspect, comp.duration);
                        adj.adjustmentLayer = true;
                        adj.applyPreset(targetFile);
                    } else {
                        for (var i = 0; i < selectedLayers.length; i++) {
                            selectedLayers[i].applyPreset(targetFile);
                        }
                    }
                } else if (presetType === "SFX_AUDIO") {
                    var importOpts = new ImportOptions(targetFile);
                    var audioItem = app.project.importFile(importOpts);
                    var audioLayer = comp.layers.add(audioItem);
                    audioLayer.startTime = comp.time;
                } else if (presetType === "TEXT_V2") {
                    var textLayer = comp.layers.addText("GHOSTAE TEXT");
                    if (targetFile.exists) {
                        textLayer.applyPreset(targetFile);
                    }
                }

                app.endUndoGroup();
                return { success: true, compName: comp.name };
            } catch (err) {
                app.endUndoGroup();
                return { success: false, error: err.toString() };
            }
        }
    };
})();
