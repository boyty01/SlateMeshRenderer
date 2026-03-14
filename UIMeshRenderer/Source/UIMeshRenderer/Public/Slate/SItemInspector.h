// Copyright DMTesseract Ltd. All rights reserved.

#pragma once

#include "CoreMinimal.h"
#include "Widgets/SCompoundWidget.h"
#include "Slate/SceneViewport.h"
#include "Widgets/SViewport.h"
#include "ItemInspectorViewportClient.h"
#include "Components/SceneCaptureComponent2D.h"
#include "UObject/GCObject.h"

class ADirectionalLight;
class SItemInspector;

/* 
*   Container for the UWorld and its contents. Separated for clarity from the Slate component itself.  We inherit from FGCObject to prevent our private scene from being Garbage Collected.
*   
*   Handler can be accessed via the SItemInspector widget via SItemInspector->GetWorldHandler() natively, or, in blueprints, the ItemInspectorWidget can retrieve actor ptrs directly via UFUNCTIONS for standard actor access. See
*   ItemInspectorWidget for details.
*/
class FItemInspectorWorldHandler : public FGCObject
{

    friend class SItemInspector;

public:
    FItemInspectorWorldHandler();
    ~FItemInspectorWorldHandler();

    FString GetReferencerName() const override;

    void Initialize(TSubclassOf<AActor> ActorToSpawn = nullptr);   

    // spawn and replace the scene actor with the class provided.
    AActor* SpawnSceneActor(TSubclassOf<AActor> ClassToSpawn);
    void AddSceneActorRotation(float DeltaPitch, float DeltaYaw, float DeltaRoll);
    AActor* GetCurrentSceneActor()
    {
        return SceneActor;
    };

    // offset the mesh on Y and Z axis. X is not supported! Use camera zoom to get closer to the mesh
    void AddSceneActorWorldOffset(const float OffsetY, const float OffsetZ);

    void SetLightIntensity(float Intensity);    
    void SetLightRotation(FRotator NewRot);
    ADirectionalLight* GetSceneLight() { return SceneLight; };

    void ReleaseResources();
    UWorld* GetWorld() const { return PrivateWorld; }
    virtual void AddReferencedObjects(FReferenceCollector& Collector) override;

    void SetStaticMeshActorVisualMesh(UStaticMesh* StaticMesh);
private:

    void CenterSceneActor();

    void ForceMeshFullResolution();
    
    FVector CachedBoundsExtent;
    TObjectPtr<UWorld> PrivateWorld;
    TObjectPtr<AActor> SceneActor;
    TObjectPtr<ADirectionalLight> SceneLight;
};


class SItemInspector : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SItemInspector) {}
       SLATE_ARGUMENT(FRotator, LightDirection)
       SLATE_ARGUMENT(float, MinCameraDistance)
       SLATE_ARGUMENT(float, MaxCameraDistance)
       SLATE_ARGUMENT(float, DefaultDistance)
       SLATE_ARGUMENT(bool, ShouldSpawnAsStaticMesh)
       SLATE_ARGUMENT(UStaticMesh*, DefaultStaticMesh)
       SLATE_ARGUMENT(float, FieldOfView)
       SLATE_ARGUMENT(bool, AutoFitCamera)
       SLATE_ARGUMENT(TSubclassOf<AActor>, DefaultSceneActor)
    SLATE_END_ARGS()

    SItemInspector();
    virtual ~SItemInspector();

    void Construct(const FArguments& InArgs);

    TSharedRef<FItemInspectorWorldHandler> GetWorldHandler() { return WorldHandler; };

    void UpdateCamera(const float DeltaZoom);

    virtual void Tick(const FGeometry& AllottedGeometry, const double InCurrentTime, const float InDeltaTime) override;

    void ReleaseResources();

    const TSharedPtr<FItemInspectorViewportClient>& GetViewportClient() { return ViewportClient; };

    // automatically calculate the camera position so the mesh fits in frame
    void AutoFitCamera();

private:

    EActiveTimerReturnType  ActiveTimerCallback(double InCurrentTime, float InDeltaTime);

    TObjectPtr<UMaterialInterface> PostProcessMaterial;

    TSharedRef<FItemInspectorWorldHandler> WorldHandler;

    bool bAutoFitCamera;

    TSharedPtr<FItemInspectorViewportClient> ViewportClient;
    TSharedPtr<FSceneViewport> SceneViewport;
    TSharedPtr<SViewport> ViewportWidget;


};