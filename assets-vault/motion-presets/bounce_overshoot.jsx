/**
 * Bounce & Overshoot Keyframe Expression Generator
 */
(function applyBounceOvershoot() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return;
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) return;

    app.beginUndoGroup("Apply Hub Bounce Expression");
    for (var i = 0; i < selectedLayers.length; i++) {
        var prop = selectedLayers[i].property("Position");
        if (prop && prop.canSetExpression) {
            prop.expression = "freq = 3.0; decay = 5.0; n = 0; if (numKeys > 0){ n = nearestKey(time).index; if (key(n).time > time){ n--; } } if (n == 0){ t = 0; } else { t = time - key(n).time; } if (n > 0){ v = velocityAtTime(key(n).time - thisComp.frameDuration/10); value + v*(Math.sin(freq*t*2*Math.PI)/Math.exp(decay*t)); } else { value; }";
        }
    }
    app.endUndoGroup();
})();
