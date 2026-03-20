/**
 * UIMeshRenderer Plugin Documentation Data
 * Loaded by index.html before renderer.js.
 *
 * To document a new plugin, copy this file, replace all content inside
 * window.PLUGIN_DATA = { ... }, and update the <script> src in index.html.
 *
 * ── SCHEMA REFERENCE ──────────────────────────────────────────────────────
 *
 * plugin        { name, module, description, logoText?, namePrefix?, nameSuffix? }
 * overview      { title, subtitle, body?, callouts?: [{type:"note|tip|warn", text}] }
 * architecture  { body?, layers: [{num, name, items:[]}] }
 * workflows     [{ title, steps:[] }]
 * groups        [{ id, label, classes:["ClassName",...] }]
 *   — defines sidebar sections and the order classes appear in each section
 * classes       [{ id, name, parents:[], description, navDot, badges:[{text,cls}],
 *                  body:[memberGroup], callouts?:[{type,text}] }]
 *   memberGroup types:
 *     propertyTable  { title, type:"propertyTable",  rows:[{name,type,default?,desc,meta?}] }
 *     functionTable  { title, type:"functionTable",  rows:[{sig,desc,meta?}] }
 *     enumBlock      { title, type:"enumBlock",      enums:[{name,type?,values:[{name,desc}]}] }
 *     structBlock    { title, type:"structBlock",    structs:[{name,fields:[{name,desc}]}] }
 *     delegateList   { title, type:"delegateList",   delegates:[{sig,desc}] }
 *     calloutGroup   { title, type:"calloutGroup",   callouts:[{type,text}] }
 *     paragraphs     { title, type:"paragraphs",     paragraphs:[] }
 *   meta tags (on rows): [{text:"BlueprintCallable", cls:"meta-bp"}, ...]
 *     cls options: meta-bp, meta-pure, meta-native, meta-impl, meta-prot, meta-cat
 * delegatesRef  [{ sig, desc }]
 *
 * In desc/text strings: `code` renders as <code>code</code>
 *                        **text** renders as <strong>text</strong>
 */

window.PLUGIN_DATA = {

    // ── PLUGIN METADATA ───────────────────────────────────────────────────────
    plugin: {
        name:        "UIMeshRenderer",
        module:      "UIMeshRenderer",
        description: "Unreal Engine 5 — C++ Plugin",
        logoText:    "UI",
        namePrefix:  "",
        nameSuffix:  ""
    },

    // ── OVERVIEW ──────────────────────────────────────────────────────────────
    overview: {
        title:    "UIMeshRenderer Plugin",
        subtitle: "Unreal Engine 5 — C++ Plugin Reference | Module: `UIMeshRenderer`",
        body:     "UIMeshRenderer is an Unreal Engine 5 plugin that embeds a fully isolated 3D scene into a UMG widget. It creates a private `UWorld` with its own directional light, spawns an arbitrary actor or static mesh inside it, and renders the result into a `FSceneViewport` that sits inside a standard UMG widget slot. Camera orbit, zoom, and actor rotation are controlled programmatically so that input handling stays entirely in Blueprint — the widget itself never captures mouse focus, eliminating conflicts with the main game viewport.",
        callouts: [
            {
                type: "tip",
                text: "Add `UItemInspectorWidget` to your UMG layout and drive it entirely via **BlueprintCallable** UFUNCTIONs. Pass input axis values from your HUD widget's `OnMouseMove` / scroll bindings down to `AddSceneActorRotation` and `AddZoomInput` — the widget never steals focus from the game."
            },
            {
                type: "note",
                text: "Physics and FX systems are disabled by default for performance. Enable `bEnablePhysics` or `bEnableFXSystems` only when needed; doing so forces the private world to tick every frame regardless of whether any input has been received."
            },
            {
                type: "warn",
                text: "The private world and viewport resources must be explicitly released. `UItemInspectorWidget` calls `ReleaseSlateResources` and handles cleanup via `BeginDestroy`, but if you hold raw pointers to the `SItemInspector` or `FItemInspectorWorldHandler` externally, ensure they are released before the widget is destroyed."
            }
        ]
    },

    // ── ARCHITECTURE ──────────────────────────────────────────────────────────
    architecture: {
        body: "The plugin is organised into five layers. Each layer depends only on layers below it; the UMG layer at the top is the only one intended to be used directly from Blueprint.",
        layers: [
            { num: 1, name: "UMG / Blueprint Interface",  items: ["UItemInspectorWidget"] },
            { num: 2, name: "Slate Compound Widget",       items: ["SItemInspector", "SItemInspectorViewport"] },
            { num: 3, name: "Viewport Client",             items: ["FItemInspectorViewportClient"] },
            { num: 4, name: "Private World Management",    items: ["FItemInspectorWorldHandler"] },
            { num: 5, name: "Module",                      items: ["FUIMeshRendererModule"] }
        ]
    },

    // ── WORKFLOWS ─────────────────────────────────────────────────────────────
    workflows: [
        {
            title: "Widget Initialisation",
            steps: [
                "Place `UItemInspectorWidget` into a UMG layout in the editor.",
                "Configure appearance properties (`SceneFOV`, `LightDirection`, `bInitialiseAsStaticMeshActor`, etc.) in the Details panel.",
                "At runtime, `RebuildWidget` is called by UMG; it constructs `SItemInspector` with the configured arguments.",
                "`SItemInspector::Construct` creates `FItemInspectorWorldHandler`, initialises the private world, spawns the default actor or static mesh, and sets up the viewport client.",
                "If `bAutoFitCameraDistance` is true, `AutoFitCamera` is called after the scene actor is spawned to frame it correctly."
            ]
        },
        {
            title: "Swapping the Scene Actor",
            steps: [
                "Call `SetSceneActor(ActorClass)` or `SetSceneActorAsStaticMesh(Mesh)` from Blueprint at any time.",
                "`UItemInspectorWidget` forwards the call to `SItemInspector`, which calls `FItemInspectorWorldHandler::SpawnSceneActor`.",
                "The world handler destroys the previous scene actor and spawns the new one inside the private world.",
                "The new actor is centred using internal bounds calculation.",
                "If `bAutoFitCameraDistance` is active, `AutoFitCamera` re-frames the camera to the new actor's bounds.",
                "`MarkSceneDirty` is set so a redraw occurs on the next tick."
            ]
        },
        {
            title: "Driving Camera and Rotation from Blueprint",
            steps: [
                "Bind your HUD widget's mouse delta events (or touch drag) and pass them to `AddSceneActorRotation(FRotator)` to rotate the displayed actor.",
                "Pass scroll wheel or pinch-zoom delta to `AddZoomInput(float)` to adjust camera distance.",
                "`SItemInspector` forwards zoom to `FItemInspectorViewportClient::UpdateCamera`, which clamps distance to `[MinDistance, MaxDistance]` and recalculates camera position.",
                "`MarkSceneDirty` ensures the viewport redraws on the next `Tick`.",
                "Without physics or FX active, the private world only ticks when `bSceneDirty` is true — keeping idle CPU cost near zero."
            ]
        },
        {
            title: "Static Mesh Quick-Setup",
            steps: [
                "In the widget Details panel, enable `bInitialiseAsStaticMeshActor` and assign `DefaultStaticMesh`.",
                "On widget rebuild, `UItemInspectorWidget` calls `SetSceneActorAsStaticMesh` automatically.",
                "A `AStaticMeshActor` is spawned in the private world with the specified mesh assigned.",
                "Optionally set `InitialSceneActorOffset` to shift the actor within the viewport frame.",
                "Use `SetSceneFieldOfView` at runtime to zoom the perspective without changing camera distance."
            ]
        }
    ],

    // ── SIDEBAR NAV GROUPS ────────────────────────────────────────────────────
    groups: [
        { id: "umg-heading",    label: "UMG Widgets",    classes: ["UItemInspectorWidget"] },
        { id: "slate-heading",  label: "Slate Widgets",  classes: ["SItemInspector", "SItemInspectorViewport"] },
        { id: "client-heading", label: "Viewport",       classes: ["FItemInspectorViewportClient"] },
        { id: "world-heading",  label: "World",          classes: ["FItemInspectorWorldHandler"] },
        { id: "module-heading", label: "Module",         classes: ["FUIMeshRendererModule"] }
    ],

    // ── CLASSES ───────────────────────────────────────────────────────────────
    classes: [

        // ── UItemInspectorWidget ───────────────────────────────────────────────
        {
            id:          "UItemInspectorWidget",
            name:        "UItemInspectorWidget",
            parents:     ["UWidget"],
            navDot:      "dot-component",
            description: "UMG wrapper around `SItemInspector`. Add this to a UMG layout to embed a live 3D preview viewport into the game HUD. All Blueprint interaction goes through the UFUNCTIONs on this class. The viewport deliberately ignores all input — route mouse deltas and scroll events from the owning HUD widget into `AddSceneActorRotation` and `AddZoomInput` manually.",
            badges: [
                { text: "UWidget",       cls: "badge-component" },
                { text: "BlueprintType", cls: "badge-blueprintable" },
                { text: "UIMESHRENDERER_API", cls: "badge-module" }
            ],
            body: [
                {
                    title: "Blueprint Callable Functions",
                    type:  "functionTable",
                    rows: [
                        {
                            sig:  "void AddSceneActorRotation(FRotator AdditiveRot)",
                            desc: "Applies an additive rotation to the scene actor each call. Designed to be driven by mouse-delta or touch-drag input from the owning HUD. Internally updates `MeshRotation` on the viewport client and marks the scene dirty.",
                            meta: [{ text: "BlueprintCallable", cls: "meta-bp" }, { text: "3D Inspector", cls: "meta-cat" }]
                        },
                        {
                            sig:  "void AddZoomInput(float InDelta)",
                            desc: "Adjusts camera distance by `InDelta`. Positive values move the camera closer, negative values move it further away. Clamped to `[MinCameraDistance, MaxCameraDistance]`.",
                            meta: [{ text: "BlueprintCallable", cls: "meta-bp" }, { text: "3D Inspector", cls: "meta-cat" }]
                        },
                        {
                            sig:  "AActor* SetSceneActor(TSubclassOf<AActor> ActorToSpawn)",
                            desc: "Destroys the current scene actor and spawns a new instance of `ActorToSpawn` inside the private world. Returns a pointer to the new actor. If `bAutoFitCameraDistance` is enabled, the camera is re-fitted to the new actor's bounds.",
                            meta: [{ text: "BlueprintCallable", cls: "meta-bp" }, { text: "3D Inspector", cls: "meta-cat" }]
                        },
                        {
                            sig:  "AStaticMeshActor* SetSceneActorAsStaticMesh(UStaticMesh* StaticMesh)",
                            desc: "Convenience variant of `SetSceneActor` — spawns an `AStaticMeshActor` and assigns `StaticMesh` to it. Returns the spawned actor cast to `AStaticMeshActor*`.",
                            meta: [{ text: "BlueprintCallable", cls: "meta-bp" }, { text: "3D Inspector", cls: "meta-cat" }]
                        },
                        {
                            sig:  "AActor* GetSceneActor()",
                            desc: "Returns the actor currently displayed in the viewport. May be `nullptr` if no actor has been spawned yet.",
                            meta: [{ text: "BlueprintCallable", cls: "meta-bp" }, { text: "3D Inspector", cls: "meta-cat" }]
                        },
                        {
                            sig:  "ADirectionalLight* GetSceneLight()",
                            desc: "Returns the directional light actor inside the private world. Use this to drive light colour, intensity, or rotation from Blueprint at runtime.",
                            meta: [{ text: "BlueprintCallable", cls: "meta-bp" }, { text: "3D Inspector", cls: "meta-cat" }]
                        },
                        {
                            sig:  "void SetSceneFieldOfView(const float NewFOV)",
                            desc: "Sets the perspective field of view for the scene camera. Useful for zooming the view without changing physical camera distance.",
                            meta: [{ text: "BlueprintCallable", cls: "meta-bp" }, { text: "3D Inspector||FOV", cls: "meta-cat" }]
                        }
                    ]
                },
                {
                    title: "Appearance Properties",
                    type:  "propertyTable",
                    rows: [
                        {
                            name: "SceneFOV", type: "float", default: "60.0",
                            desc: "Perspective field of view for the scene camera, in degrees. Can also be changed at runtime via `SetSceneFieldOfView`.",
                            meta: [{ text: "EditAnywhere", cls: "meta-bp" }, { text: "Appearance", cls: "meta-cat" }]
                        },
                        {
                            name: "bInitialiseAsStaticMeshActor", type: "bool", default: "false",
                            desc: "When true, the widget initialises with an `AStaticMeshActor` using `DefaultStaticMesh`. When false, it spawns `DefaultSceneActor` instead.",
                            meta: [{ text: "EditAnywhere", cls: "meta-bp" }, { text: "Appearance", cls: "meta-cat" }]
                        },
                        {
                            name: "DefaultStaticMesh", type: "UStaticMesh*", default: "nullptr",
                            desc: "The mesh assigned on startup when `bInitialiseAsStaticMeshActor` is true.",
                            meta: [{ text: "EditAnywhere", cls: "meta-bp" }, { text: "Appearance", cls: "meta-cat" }]
                        },
                        {
                            name: "DefaultSceneActor", type: "TSubclassOf<AActor>", default: "nullptr",
                            desc: "The actor class spawned on startup when `bInitialiseAsStaticMeshActor` is false.",
                            meta: [{ text: "EditAnywhere", cls: "meta-bp" }, { text: "Appearance", cls: "meta-cat" }]
                        },
                        {
                            name: "InitialSceneActorOffset", type: "FVector", default: "FVector::ZeroVector",
                            desc: "World-space offset applied to the scene actor after it is spawned and centred. Allows nudging the actor within the viewport frame without modifying the mesh pivot.",
                            meta: [{ text: "EditAnywhere", cls: "meta-bp" }, { text: "Appearance", cls: "meta-cat" }]
                        },
                        {
                            name: "LightDirection", type: "FRotator", default: "(0, 180, 0)",
                            desc: "Initial rotation of the directional light in the private world.",
                            meta: [{ text: "EditAnywhere", cls: "meta-bp" }, { text: "Light", cls: "meta-cat" }]
                        }
                    ]
                },
                {
                    title: "Performance Properties",
                    type:  "propertyTable",
                    rows: [
                        {
                            name: "bEnablePhysics", type: "bool", default: "false",
                            desc: "Enables physics simulation in the private world. When false, the world only ticks when input is received (`bSceneDirty`). Enabling this forces the world to tick every frame.",
                            meta: [{ text: "EditAnywhere", cls: "meta-bp" }, { text: "Performance", cls: "meta-cat" }]
                        },
                        {
                            name: "bEnableFXSystems", type: "bool", default: "false",
                            desc: "Enables FX (Niagara / Cascade) systems in the private world. Some particle systems require physics to be enabled as well. Also forces per-frame ticking.",
                            meta: [{ text: "EditAnywhere", cls: "meta-bp" }, { text: "Performance", cls: "meta-cat" }]
                        }
                    ]
                },
                {
                    title: "Camera Properties",
                    type:  "propertyTable",
                    rows: [
                        {
                            name: "bAutoFitCameraDistance", type: "bool", default: "true",
                            desc: "When true, min/max/default camera distances are computed from the scene actor's bounding box each time an actor is spawned. Disable to use the manual distance values below.",
                            meta: [{ text: "EditAnywhere", cls: "meta-bp" }, { text: "Camera", cls: "meta-cat" }]
                        },
                        {
                            name: "MinCameraDistance", type: "float", default: "20.0",
                            desc: "Minimum camera distance in cm. Only used when `bAutoFitCameraDistance` is false.",
                            meta: [{ text: "EditAnywhere", cls: "meta-bp" }, { text: "Camera", cls: "meta-cat" }]
                        },
                        {
                            name: "DefaultCameraDistance", type: "float", default: "150.0",
                            desc: "Starting camera distance in cm. Only used when `bAutoFitCameraDistance` is false.",
                            meta: [{ text: "EditAnywhere", cls: "meta-bp" }, { text: "Camera", cls: "meta-cat" }]
                        },
                        {
                            name: "MaxCameraDistance", type: "float", default: "300.0",
                            desc: "Maximum camera distance in cm. Only used when `bAutoFitCameraDistance` is false.",
                            meta: [{ text: "EditAnywhere", cls: "meta-bp" }, { text: "Camera", cls: "meta-cat" }]
                        }
                    ]
                },
                {
                    title: "UWidget Interface",
                    type:  "functionTable",
                    rows: [
                        {
                            sig:  "virtual TSharedRef<SWidget> RebuildWidget() override",
                            desc: "Called by UMG to construct or reconstruct the underlying Slate widget. Creates `SItemInspector` with all configured property values as Slate arguments.",
                            meta: [{ text: "Override", cls: "meta-impl" }]
                        },
                        {
                            sig:  "virtual void ReleaseSlateResources(bool bReleaseChildren) override",
                            desc: "Releases the `SItemInspector` shared pointer and calls `ReleaseResources` to clean up the private world and viewport.",
                            meta: [{ text: "Override", cls: "meta-impl" }]
                        },
                        {
                            sig:  "virtual void BeginDestroy() override",
                            desc: "Ensures resources are freed when the widget is garbage collected.",
                            meta: [{ text: "Override", cls: "meta-impl" }]
                        },
                        {
                            sig:  "virtual void PostEditChangeProperty(FPropertyChangedEvent&) override",
                            desc: "Editor-only. Rebuilds the widget when a property is changed in the Details panel so the viewport reflects the new configuration immediately.",
                            meta: [{ text: "Override", cls: "meta-impl" }, { text: "WITH_EDITOR", cls: "meta-native" }]
                        }
                    ]
                }
            ]
        },

        // ── SItemInspector ─────────────────────────────────────────────────────
        {
            id:          "SItemInspector",
            name:        "SItemInspector",
            parents:     ["SCompoundWidget"],
            navDot:      "dot-component",
            description: "Core Slate compound widget. Owns the `FItemInspectorWorldHandler`, the `FItemInspectorViewportClient`, and the `FSceneViewport`. Responsible for ticking the private world, managing the dirty-flag redraw optimisation, and exposing camera/rotation control to `UItemInspectorWidget`. Not intended for direct Blueprint use — access it through `UItemInspectorWidget`.",
            badges: [
                { text: "SCompoundWidget", cls: "badge-component" },
                { text: "C++ Only",        cls: "badge-native" }
            ],
            body: [
                {
                    title: "Slate Arguments",
                    type:  "propertyTable",
                    rows: [
                        { name: "LightDirection",        type: "FRotator",             default: "(0,180,0)", desc: "Initial rotation of the scene directional light." },
                        { name: "MinCameraDistance",     type: "float",                default: "—",         desc: "Minimum allowed camera distance. Forwarded to `FItemInspectorViewportClient`." },
                        { name: "MaxCameraDistance",     type: "float",                default: "—",         desc: "Maximum allowed camera distance. Forwarded to `FItemInspectorViewportClient`." },
                        { name: "DefaultDistance",       type: "float",                default: "—",         desc: "Starting camera distance passed to the viewport client." },
                        { name: "ShouldSpawnAsStaticMesh", type: "bool",              default: "false",     desc: "If true, `DefaultStaticMesh` is used to initialise the scene instead of `DefaultSceneActor`." },
                        { name: "DefaultStaticMesh",     type: "UStaticMesh*",         default: "nullptr",   desc: "Mesh assigned when `ShouldSpawnAsStaticMesh` is true." },
                        { name: "FieldOfView",           type: "float",                default: "60.0",      desc: "Initial perspective FOV forwarded to `FItemInspectorViewportClient`." },
                        { name: "AutoFitCamera",         type: "bool",                 default: "true",      desc: "When true, `AutoFitCamera()` is called after the initial actor spawn." },
                        { name: "DefaultSceneActor",     type: "TSubclassOf<AActor>",  default: "nullptr",   desc: "Actor class spawned when `ShouldSpawnAsStaticMesh` is false." },
                        { name: "EnablePhysics",         type: "bool",                 default: "false",     desc: "Passed to `FItemInspectorWorldHandler::Initialize`. Enables physics in the private world." },
                        { name: "EnableFX",              type: "bool",                 default: "false",     desc: "Passed to `FItemInspectorWorldHandler::Initialize`. Enables FX systems in the private world." }
                    ]
                },
                {
                    title: "Public Functions",
                    type:  "functionTable",
                    rows: [
                        {
                            sig:  "void Construct(const FArguments& InArgs)",
                            desc: "Slate construction entry point. Creates `FItemInspectorWorldHandler`, initialises the world, spawns the default actor/mesh, creates `FItemInspectorViewportClient` and `FSceneViewport`, and lays out `SItemInspectorViewport` as the child widget.",
                            meta: [{ text: "Override", cls: "meta-impl" }]
                        },
                        {
                            sig:  "TSharedRef<FItemInspectorWorldHandler> GetWorldHandler()",
                            desc: "Returns the world handler. Use this in native C++ to access the private world, spawn actors directly, or modify the scene light."
                        },
                        {
                            sig:  "void UpdateCamera(const float DeltaZoom)",
                            desc: "Applies a zoom delta to the viewport client and marks the scene dirty so a redraw is triggered on the next tick."
                        },
                        {
                            sig:  "virtual void Tick(const FGeometry&, const double InCurrentTime, const float InDeltaTime) override",
                            desc: "Ticks the private world. If `bHasLiveSimulation` is true, ticks every frame. Otherwise ticks only when `bSceneDirty` is true, then clears the flag.",
                            meta: [{ text: "Override", cls: "meta-impl" }]
                        },
                        {
                            sig:  "void ReleaseResources()",
                            desc: "Calls `FItemInspectorWorldHandler::ReleaseResources` and resets all shared pointers, allowing the private world to be cleaned up safely."
                        },
                        {
                            sig:  "const TSharedPtr<FItemInspectorViewportClient>& GetViewportClient()",
                            desc: "Returns the viewport client. Primarily for native code that needs to adjust camera parameters directly."
                        },
                        {
                            sig:  "void AutoFitCamera()",
                            desc: "Calculates camera distance from the current scene actor's bounding box so the mesh fills the viewport at an appropriate scale, then applies the result to the viewport client."
                        },
                        {
                            sig:  "void MarkSceneDirty()",
                            desc: "Sets `bSceneDirty = true`, scheduling a redraw on the next `Tick`. Call after any operation that changes the visual state of the scene (rotation, zoom, actor swap)."
                        }
                    ]
                }
            ]
        },

        // ── SItemInspectorViewport ─────────────────────────────────────────────
        {
            id:          "SItemInspectorViewport",
            name:        "SItemInspectorViewport",
            parents:     ["SViewport"],
            navDot:      "dot-component",
            description: "Lightweight Slate viewport widget used as the drawing canvas inside `SItemInspector`. Gamma correction and direct-to-window rendering are disabled by default. Keyboard focus is explicitly suppressed — all input reaches the game viewport as normal. `OnPaint` is overridden to control the layer order of the rendered scene.",
            badges: [
                { text: "SViewport", cls: "badge-component" },
                { text: "C++ Only", cls: "badge-native" }
            ],
            body: [
                {
                    title: "Slate Arguments",
                    type:  "propertyTable",
                    rows: [
                        { name: "EnableGammaCorrection",  type: "bool", default: "false", desc: "Passed to the parent `SViewport`. Should remain false for UI-embedded scene viewports." },
                        { name: "RenderDirectlyToWindow", type: "bool", default: "false", desc: "Passed to the parent `SViewport`. Should remain false when embedded in a UMG widget hierarchy." }
                    ]
                },
                {
                    title: "Functions",
                    type:  "functionTable",
                    rows: [
                        {
                            sig:  "void Construct(const FArguments& InArgs)",
                            desc: "Initialises the viewport with gamma correction and direct-to-window rendering disabled.",
                            meta: [{ text: "Override", cls: "meta-impl" }]
                        },
                        {
                            sig:  "virtual int32 OnPaint(...) const override",
                            desc: "Overrides the paint pass to control the draw layer ID of the scene, ensuring the 3D content sits at the correct depth in the Slate widget hierarchy.",
                            meta: [{ text: "Override", cls: "meta-impl" }]
                        },
                        {
                            sig:  "virtual bool SupportsKeyboardFocus() const override",
                            desc: "Always returns `false`. The viewport never captures keyboard focus, keeping input routed to the game viewport.",
                            meta: [{ text: "Override", cls: "meta-impl" }, { text: "const", cls: "meta-pure" }]
                        }
                    ]
                }
            ]
        },

        // ── FItemInspectorViewportClient ───────────────────────────────────────
        {
            id:          "FItemInspectorViewportClient",
            name:        "FItemInspectorViewportClient",
            parents:     ["FViewportClient", "FGCObject"],
            navDot:      "dot-component",
            description: "Viewport client that drives the `FSceneViewport` inside `SItemInspector`. Manages the camera transform, field of view, and distance constraints. Overrides mouse-capture and focus methods to ensure no input is intercepted. Inherits `FGCObject` purely to hold a reference to the private `UWorld` and prevent it from being garbage collected.",
            badges: [
                { text: "FViewportClient", cls: "badge-component" },
                { text: "FGCObject",       cls: "badge-native" },
                { text: "C++ Only",        cls: "badge-native" }
            ],
            body: [
                {
                    title: "Constructor",
                    type:  "functionTable",
                    rows: [
                        {
                            sig:  "FItemInspectorViewportClient(UWorld* InWorld, float InMinDistance, float InMaxDistance, float InDefaultDistance, float InFieldOfView = 60.f)",
                            desc: "Initialises the client with the private world and camera distance constraints. `InFieldOfView` defaults to 60 degrees."
                        }
                    ]
                },
                {
                    title: "Camera Controls",
                    type:  "propertyTable",
                    rows: [
                        { name: "MeshRotation",    type: "FRotator", default: "—", desc: "Current rotation of the scene actor, updated each frame by `AddSceneActorRotation` calls passed down from `UItemInspectorWidget`." },
                        { name: "ViewDistance",    type: "float",    default: "—", desc: "Current distance from the look-at point. Set via `SetCameraDistance` or `UpdateCamera`." },
                        { name: "LookAtLocation",  type: "FVector",  default: "—", desc: "World-space point the camera orbits around. Typically the scene actor's centroid." },
                        { name: "CameraLocation",  type: "FVector",  default: "—", desc: "Computed world-space camera position, derived from `MeshRotation` and `ViewDistance`." },
                        { name: "CameraRotation",  type: "FRotator", default: "—", desc: "Computed camera rotation, pointing from `CameraLocation` toward `LookAtLocation`." }
                    ]
                },
                {
                    title: "Camera Functions",
                    type:  "functionTable",
                    rows: [
                        {
                            sig:  "float GetFieldOfView() const",
                            desc: "Returns the current perspective FOV in degrees.",
                            meta: [{ text: "const", cls: "meta-pure" }]
                        },
                        {
                            sig:  "void SetFieldOfView(const float FOV)",
                            desc: "Sets the perspective FOV. Call `MarkSceneDirty` on `SItemInspector` afterwards to trigger a redraw."
                        },
                        {
                            sig:  "void SetCameraDistance(const float NewDistance)",
                            desc: "Directly sets the current camera distance without clamping. Prefer `UpdateCamera` for user-driven zoom."
                        },
                        {
                            sig:  "void SetCameraDistanceRange(float Min, float Max, float Current)",
                            desc: "Sets min, max, and current camera distance simultaneously. Used during auto-fit to reconfigure the distance range based on mesh bounds."
                        },
                        {
                            sig:  "void UpdateCamera(float DeltaYaw, float DeltaPitch, float DeltaZoom)",
                            desc: "Applies yaw, pitch, and zoom deltas to the camera. Zoom is clamped to `[MinDistance, MaxDistance]`. Recomputes `CameraLocation` and `CameraRotation`."
                        }
                    ]
                },
                {
                    title: "FViewportClient Interface",
                    type:  "functionTable",
                    rows: [
                        {
                            sig:  "virtual void Draw(FViewport* Viewport, FCanvas* Canvas) override",
                            desc: "Renders the private world scene into `Canvas` using the computed camera transform and FOV.",
                            meta: [{ text: "Override", cls: "meta-impl" }]
                        },
                        {
                            sig:  "virtual UWorld* GetWorld() const override",
                            desc: "Returns `PreviewWorld` — the private `UWorld` owned by `FItemInspectorWorldHandler`.",
                            meta: [{ text: "Override", cls: "meta-impl" }, { text: "const", cls: "meta-pure" }]
                        },
                        {
                            sig:  "virtual bool RequiresHitProxyStorage() override",
                            desc: "Returns `false` — hit proxies are not needed for a non-interactive preview viewport.",
                            meta: [{ text: "Override", cls: "meta-impl" }]
                        },
                        {
                            sig:  "virtual EMouseCaptureMode GetMouseCaptureMode() const override",
                            desc: "Returns `EMouseCaptureMode::NoCapture` — the viewport never captures the mouse.",
                            meta: [{ text: "Override", cls: "meta-impl" }, { text: "const", cls: "meta-pure" }]
                        },
                        {
                            sig:  "virtual bool CaptureMouseOnLaunch() override",
                            desc: "Returns `false`.",
                            meta: [{ text: "Override", cls: "meta-impl" }]
                        },
                        {
                            sig:  "virtual bool LockDuringCapture() override",
                            desc: "Returns `false`.",
                            meta: [{ text: "Override", cls: "meta-impl" }]
                        },
                        {
                            sig:  "virtual bool HideCursorDuringCapture() const override",
                            desc: "Returns `false`.",
                            meta: [{ text: "Override", cls: "meta-impl" }, { text: "const", cls: "meta-pure" }]
                        }
                    ]
                },
                {
                    title: "FGCObject Interface",
                    type:  "functionTable",
                    rows: [
                        {
                            sig:  "virtual void AddReferencedObjects(FReferenceCollector& Collector) override",
                            desc: "Adds `PreviewWorld` to the collector, preventing the private world from being garbage collected while the viewport client is alive.",
                            meta: [{ text: "Override", cls: "meta-impl" }]
                        },
                        {
                            sig:  "virtual FString GetReferencerName() const override",
                            desc: "Returns `\"FItemInspectorViewportClient\"` for GC debugging.",
                            meta: [{ text: "Override", cls: "meta-impl" }, { text: "const", cls: "meta-pure" }]
                        }
                    ]
                }
            ]
        },

        // ── FItemInspectorWorldHandler ─────────────────────────────────────────
        {
            id:          "FItemInspectorWorldHandler",
            name:        "FItemInspectorWorldHandler",
            parents:     ["FGCObject"],
            navDot:      "dot-component",
            description: "Owns and manages the private `UWorld` used for 3D preview rendering. Handles world creation, actor spawning, scene lighting, actor centering based on mesh bounds, and resource teardown. Separated from `SItemInspector` for clarity. Accessible from native C++ via `SItemInspector::GetWorldHandler()`.",
            badges: [
                { text: "FGCObject", cls: "badge-native" },
                { text: "C++ Only", cls: "badge-native" }
            ],
            body: [
                {
                    title: "Lifecycle",
                    type:  "functionTable",
                    rows: [
                        {
                            sig:  "FItemInspectorWorldHandler()",
                            desc: "Default constructor. The world is not created until `Initialize` is called."
                        },
                        {
                            sig:  "~FItemInspectorWorldHandler()",
                            desc: "Destructor. Calls `ReleaseResources` if not already called."
                        },
                        {
                            sig:  "void Initialize(TSubclassOf<AActor> ActorToSpawn = nullptr, bool bEnablePhysics = false, bool bEnableFX = false)",
                            desc: "Creates the private `UWorld`, spawns a directional light, optionally spawns `ActorToSpawn`, and sets up physics/FX subsystems according to the flags. Must be called before any other method."
                        },
                        {
                            sig:  "void ReleaseResources()",
                            desc: "Destroys the scene actor, the directional light, and the private world. Safe to call multiple times."
                        }
                    ]
                },
                {
                    title: "Scene Actor Functions",
                    type:  "functionTable",
                    rows: [
                        {
                            sig:  "AActor* SpawnSceneActor(TSubclassOf<AActor> ClassToSpawn)",
                            desc: "Destroys the current scene actor (if any) and spawns a new instance of `ClassToSpawn` in the private world. Calls `CenterSceneActor` and `ForceMeshFullResolution` after spawning. Returns the new actor."
                        },
                        {
                            sig:  "void AddSceneActorRotation(float DeltaPitch, float DeltaYaw, float DeltaRoll)",
                            desc: "Adds an incremental rotation to the scene actor's world rotation."
                        },
                        {
                            sig:  "AActor* GetCurrentSceneActor()",
                            desc: "Returns the currently active scene actor, or `nullptr` if none has been spawned."
                        },
                        {
                            sig:  "void AddSceneActorWorldOffset(float OffsetY, float OffsetZ)",
                            desc: "Offsets the scene actor on the Y and Z axes. X-axis offset is not supported — use camera zoom (`UpdateCamera`) to adjust depth instead."
                        },
                        {
                            sig:  "void SetStaticMeshActorVisualMesh(UStaticMesh* StaticMesh)",
                            desc: "Assigns a new static mesh to the current scene actor, assuming it is an `AStaticMeshActor`. Used by `UItemInspectorWidget::SetSceneActorAsStaticMesh`."
                        }
                    ]
                },
                {
                    title: "Lighting Functions",
                    type:  "functionTable",
                    rows: [
                        {
                            sig:  "void SetLightIntensity(float Intensity)",
                            desc: "Sets the intensity of the scene directional light."
                        },
                        {
                            sig:  "void SetLightRotation(FRotator NewRot)",
                            desc: "Sets the world rotation of the scene directional light."
                        },
                        {
                            sig:  "ADirectionalLight* GetSceneLight()",
                            desc: "Returns the directional light actor. Expose to Blueprint via `UItemInspectorWidget::GetSceneLight`."
                        }
                    ]
                },
                {
                    title: "World Access",
                    type:  "functionTable",
                    rows: [
                        {
                            sig:  "UWorld* GetWorld() const",
                            desc: "Returns the private `UWorld*`. Used by `FItemInspectorViewportClient::GetWorld`.",
                            meta: [{ text: "const", cls: "meta-pure" }]
                        }
                    ]
                },
                {
                    title: "FGCObject Interface",
                    type:  "functionTable",
                    rows: [
                        {
                            sig:  "virtual void AddReferencedObjects(FReferenceCollector& Collector) override",
                            desc: "Adds `PrivateWorld`, `SceneActor`, and `SceneLight` to the GC reference collector.",
                            meta: [{ text: "Override", cls: "meta-impl" }]
                        },
                        {
                            sig:  "virtual FString GetReferencerName() const override",
                            desc: "Returns `\"FItemInspectorWorldHandler\"` for GC debugging.",
                            meta: [{ text: "Override", cls: "meta-impl" }, { text: "const", cls: "meta-pure" }]
                        }
                    ]
                }
            ]
        },

        // ── FUIMeshRendererModule ──────────────────────────────────────────────
        {
            id:          "FUIMeshRendererModule",
            name:        "FUIMeshRendererModule",
            parents:     ["IModuleInterface"],
            navDot:      "dot-component",
            description: "Standard Unreal Engine module class for the UIMeshRenderer plugin. Implements `IModuleInterface` startup and shutdown hooks. No public API beyond the module lifecycle — all plugin functionality is accessed through `UItemInspectorWidget`.",
            badges: [
                { text: "IModuleInterface", cls: "badge-native" },
                { text: "C++ Only",         cls: "badge-native" }
            ],
            body: [
                {
                    title: "Functions",
                    type:  "functionTable",
                    rows: [
                        {
                            sig:  "virtual void StartupModule() override",
                            desc: "Called by the engine when the module is loaded. Performs any one-time initialisation required by the plugin.",
                            meta: [{ text: "Override", cls: "meta-impl" }]
                        },
                        {
                            sig:  "virtual void ShutdownModule() override",
                            desc: "Called by the engine when the module is unloaded. Cleans up any resources registered during startup.",
                            meta: [{ text: "Override", cls: "meta-impl" }]
                        }
                    ]
                }
            ]
        }

    ] // end classes

}; // end window.PLUGIN_DATA
