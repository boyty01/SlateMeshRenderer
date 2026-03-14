# UI Mesh Renderer

## Drag and drop widget that renders 3D meshes or Blueprints directly into the widget without having to set up scene capture cameras or render targets.

A common issue among the Unreal community is how to render 3D Meshes into the UI without awkward, unscalable solutions.  

UI Mesh Renderer spins up a custom private UWorld for each instance of the widget and renders out a scene with a single AActor & Directional light directly to the widget.



### V1 Limiations - Capped Resolution
SViewports get drawn to the resolution requested by the widget's screen space.  As UMG's designer graph allows designers to zoom in very close to a widget, this can explode the viewport resolution to levels that flood the GPU's VRAM instantly. 
To resolve this, the viewport is currently limited to 2048x2048 resolution, regardless of the space requested - which may result in the viewport not stretching to fit it's parent container in larger desktop resolutions (>= 4k).  This is slated to be fixed in the next update. 
