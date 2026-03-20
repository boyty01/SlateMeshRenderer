// Copyright DMTesseract Ltd. All rights reserved.

#pragma once

#include "CoreMinimal.h"
#include "Components/Widget.h"
#include "Slate/SItemInspector.h" 
#include "ItemInspectorWidget.generated.h"

class ADirectionalLight;

/* 
*  UMG Implementation for the inspector slate widget.  Use this in UMG to create an inspector widget that exposes functionality to designer view. 
*  The Viewport for the private world purposely ignores any inputs to avoid input juggling between itself and the main game viewport.  Any input capture should be done on this
*  widget and the inputs should be pushed down the chain using the UFUNCTIONS in this class.  
*/
UCLASS()
class UIMESHRENDERER_API UItemInspectorWidget : public UWidget
{
    GENERATED_BODY()

public:

    UItemInspectorWidget();

    virtual void BeginDestroy() override;

    // rotate the scene actors rotation by the given value
    UFUNCTION(BlueprintCallable, Category = "3D Inspector")
    void AddSceneActorRotation(FRotator AdditiveRot);

    UFUNCTION(BlueprintCallable, Category = "3D Inspector")
    void AddZoomInput(float InDelta);

    // Replace the active Scene Actor with an instance of the specified actor class.
    UFUNCTION(BlueprintCallable, Category = "3D Inspector")
    AActor* SetSceneActor(TSubclassOf<AActor> ActorToSpawn);

    UFUNCTION(BlueprintCallable, Category = "3D Inspector")
    AStaticMeshActor* SetSceneActorAsStaticMesh(UStaticMesh* StaticMesh);

    UFUNCTION(BlueprintCallable, Category ="3D Inspector")
    AActor* GetSceneActor();

    UFUNCTION(BlueprintCallable, Category= "3D Inspector")
    ADirectionalLight* GetSceneLight();

    UFUNCTION(BlueprintCallable, Category = "3D Inspector||FOV")
    void SetSceneFieldOfView(const float NewFOV);

    // UWidget Interface
    virtual void ReleaseSlateResources(bool bReleaseChildren) override;

    virtual TSharedRef<SWidget> RebuildWidget() override;

#if WITH_EDITOR
    virtual void PostEditChangeProperty(FPropertyChangedEvent& PropertyChangedEvent) override;
#endif

protected:
    // Holds the actual Slate pointer
    TSharedPtr<SItemInspector> MyInspector;

    // Enable Physics simulation in the scene. Default off for performance.
    UPROPERTY(EditAnywhere, Category = "Performance")
    bool bEnablePhysics{ false };

    // Enable FX systems in the scene. Some particle systems will not function correctly if bEnablePhysics is disabled. 
    UPROPERTY(EditAnywhere, Category = "Performance")
    bool bEnableFXSystems{ false };

    // Perspective field of view for the scene.
    UPROPERTY(EditAnywhere, Category = "Appearance")
    float SceneFOV{ 60.f };
    
    // if true, will initialise the scene actor as a static mesh actor with the mesh specified below. otherwise will initialise as DefaultSceneActor
    UPROPERTY(EditAnywhere, Category = "Appearance")
    bool bInitialiseAsStaticMeshActor;
    
    // if bInitialiseAsStaticMeshActor is true, this is the mesh that will be assigned to the scene actor.
    UPROPERTY(EditAnywhere, Category = "Appearance", meta = (EditCondition = "bInitialiseAsStaticMeshActor"))
    UStaticMesh* DefaultStaticMesh;

    // if bInitialiseAsStaticMeshActor is false, this is the actor class that will be spawned by default.
    UPROPERTY(EditAnywhere, Category = "Appearance", meta=(EditCondition = "!bInitialiseAsStaticMeshActor"))
    TSubclassOf<AActor> DefaultSceneActor;

    // Offsets the initial actor on widget creation, if an actor is spawned on rebuild.
    UPROPERTY(EditAnywhere, Category = "Appearance")
    FVector InitialSceneActorOffset;

    UPROPERTY(EditAnywhere, Category ="Light")
    FRotator LightDirection{ FRotator(0,180,0) };

    // if true, camera min/max and default distance will be calculated based on the current scene actor's bounds. Disable if you want manual control.
    UPROPERTY(EditAnywhere, Category = "Camera")
    bool bAutoFitCameraDistance{ true };

    UPROPERTY(EditAnywhere, category = "Camera", meta=(EditCondition="!bAutoFitCameraDistance"))
    float MinCameraDistance{ 20.f };

    UPROPERTY(EditAnywhere, category = "Camera", meta = (EditCondition = "!bAutoFitCameraDistance"))
    float DefaultCameraDistance{ 150.f };

    UPROPERTY(EditAnywhere, category = "Camera", meta = (EditCondition = "!bAutoFitCameraDistance"))
    float MaxCameraDistance{ 300.f };

};