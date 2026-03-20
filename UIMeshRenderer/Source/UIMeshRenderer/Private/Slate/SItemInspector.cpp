// Copyright DMTesseract Ltd. All rights reserved.

#include "Slate/SItemInspector.h"
#include "Engine/World.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "ItemInspectorViewportClient.h"
#include "UnrealClient.h"
#include "Engine/StaticMeshActor.h"
#include "Slate/SItemInspectorViewport.h"
#include "Engine/DirectionalLight.h"
#include "GameFramework/GameModeBase.h"
#include "Components/DirectionalLightComponent.h"

/* --------------------*/
/* BEGIN WORLD HANDLER */
/* --------------------*/

FItemInspectorWorldHandler::FItemInspectorWorldHandler()
{
}

FItemInspectorWorldHandler::~FItemInspectorWorldHandler()
{
    ReleaseResources();
}

void FItemInspectorWorldHandler::SetLightRotation(FRotator NewRot)
{
    if (SceneLight)
    {
        SceneLight->SetActorRotation(NewRot);
    }
}

void FItemInspectorWorldHandler::Initialize(TSubclassOf<AActor> ActorToSpawn, const bool bEnablePhysics, const bool bEnableFX)
{

    UWorld* PreviousWorld = GWorld;

    PrivateWorld = NewObject<UWorld>(GetTransientPackage(), NAME_None, RF_Transient);
    PrivateWorld->WorldType = EWorldType::Game;
    PrivateWorld->InitializeNewWorld(UWorld::InitializationValues()
        .AllowAudioPlayback(false)
        .CreatePhysicsScene(bEnablePhysics)
        .CreateNavigation(false)
        .CreateAISystem(false)
        .ShouldSimulatePhysics(bEnablePhysics)
        .CreateFXSystem(bEnableFX)
        .InitializeScenes(true)
        .SetDefaultGameMode(AGameModeBase::StaticClass())
    );

    FWorldContext& WorldContext = GEngine->CreateNewWorldContext(EWorldType::Game);
    WorldContext.SetCurrentWorld(PrivateWorld);

    GWorld = PreviousWorld;

    PrivateWorld->SetBegunPlay(true);

    if(ActorToSpawn)
        SpawnSceneActor(ActorToSpawn);

    SceneLight = PrivateWorld->SpawnActor<ADirectionalLight>();
    SceneLight->GetLightComponent()->SetIntensity(10.0f);
    SceneLight->GetLightComponent()->SetMobility(EComponentMobility::Movable);
}

void FItemInspectorWorldHandler::ReleaseResources()
{
    if (!PrivateWorld) return;

    PrivateWorld->BeginTearingDown();
    PrivateWorld->EndPlay(EEndPlayReason::Destroyed);
    PrivateWorld->ClearWorldComponents();
    PrivateWorld->FlushLevelStreaming();

    if (SceneActor)
    {
        SceneActor->Destroy();
        SceneActor = nullptr;
    }

    GEngine->DestroyWorldContext(PrivateWorld);
    PrivateWorld->DestroyWorld(true);
    PrivateWorld->MarkAsGarbage();
    PrivateWorld = nullptr;
}

void FItemInspectorWorldHandler::AddReferencedObjects(FReferenceCollector& Collector)
{
    Collector.AddReferencedObject(PrivateWorld);
    Collector.AddReferencedObject(SceneActor);
    Collector.AddReferencedObject(SceneLight);
}

void FItemInspectorWorldHandler::CenterSceneActor()
{
    if (!SceneActor) return;

    // Reset to zero first so we're always calculating from a clean state
    SceneActor->SetActorLocation(FVector::ZeroVector);

    FVector Origin;
    FVector BoxExtent;
    SceneActor->GetActorBounds(false, Origin, BoxExtent);

    SceneActor->SetActorLocation(-Origin, false, nullptr, ETeleportType::ResetPhysics);
    CachedBoundsExtent = BoxExtent;
}

void FItemInspectorWorldHandler::SetStaticMeshActorVisualMesh(UStaticMesh* StaticMesh)
{
    if (AStaticMeshActor* AsMeshActor = Cast<AStaticMeshActor>(SceneActor))
    {
        AsMeshActor->GetStaticMeshComponent()->SetStaticMesh(StaticMesh);
    }

    CenterSceneActor();
    ForceMeshFullResolution();
}

void FItemInspectorWorldHandler::ForceMeshFullResolution()
{
    if (!SceneActor) return;

    // Static meshes
    TArray<UStaticMeshComponent*> StaticMeshes;
    SceneActor->GetComponents<UStaticMeshComponent>(StaticMeshes);
    for (UStaticMeshComponent* Mesh : StaticMeshes)
    {
        Mesh->ForcedLodModel = 1;
        Mesh->bForceMipStreaming = true;
        Mesh->MarkRenderStateDirty();

        for (int32 i = 0; i < Mesh->GetNumMaterials(); i++)
        {
            UMaterialInterface* Mat = Mesh->GetMaterial(i);
            if (!Mat) continue;

            TArray<UTexture*> Textures;
            Mat->GetUsedTextures(Textures, EMaterialQualityLevel::High, true, ERHIFeatureLevel::SM5, true);
            for (UTexture* Texture : Textures)
            {
                if (UTexture2D* Tex2D = Cast<UTexture2D>(Texture))
                {
                    Tex2D->SetForceMipLevelsToBeResident(30.f);
                }
            }
        }
    }

    // Skeletal meshes
    TArray<USkeletalMeshComponent*> SkelMeshes;
    SceneActor->GetComponents<USkeletalMeshComponent>(SkelMeshes);
    for (USkeletalMeshComponent* Mesh : SkelMeshes)
    {
        Mesh->SetForcedLOD(1); // ForcedLodModel = 1;
        Mesh->bForceMipStreaming = true;
        Mesh->MarkRenderStateDirty();
        Mesh->InitAnim(true);

        for (int32 i = 0; i < Mesh->GetNumMaterials(); i++)
        {
            UMaterialInterface* Mat = Mesh->GetMaterial(i);
            if (!Mat) continue;

            TArray<UTexture*> Textures;
            Mat->GetUsedTextures(Textures, EMaterialQualityLevel::High, true, ERHIFeatureLevel::SM5, true);
            for (UTexture* Texture : Textures)
            {
                if (UTexture2D* Tex2D = Cast<UTexture2D>(Texture))
                {
                    Tex2D->SetForceMipLevelsToBeResident(30.f);
                }
            }
        }
    }


}

FString FItemInspectorWorldHandler::GetReferencerName() const
{
    return TEXT("FItemInspectorWorldHandler");
}

AActor* FItemInspectorWorldHandler::SpawnSceneActor(TSubclassOf<AActor> ClassToSpawn)
{
    if (SceneActor)
    {
        SceneActor->Destroy();
        SceneActor = nullptr;
    }

    if (ClassToSpawn && PrivateWorld)
    {
        SceneActor = PrivateWorld->SpawnActor<AActor>(ClassToSpawn, FTransform::Identity);
        SceneActor->GetRootComponent()->SetMobility(EComponentMobility::Movable);
        SceneActor->DispatchBeginPlay();
        CenterSceneActor();
        ForceMeshFullResolution();
    }


    return SceneActor;
}

void FItemInspectorWorldHandler::AddSceneActorRotation(float DeltaPitch, float DeltaYaw, float DeltaRoll)
{
    if (!SceneActor) return;
    SceneActor->AddActorWorldRotation(FRotator(DeltaPitch, DeltaYaw, DeltaRoll), false, nullptr, ETeleportType::TeleportPhysics);
 
}


/* --------------------*/
/*  END WORLD HANDLER  */
/* --------------------*/


/* -----------------------*/
/* BEGIN INSPECTOR WIDGET */
/* -----------------------*/

SItemInspector::SItemInspector()
    : WorldHandler(MakeShared<FItemInspectorWorldHandler>())
{
}

SItemInspector::~SItemInspector()
{
    ReleaseResources();
}

void SItemInspector::Construct(const FArguments& InArgs)
{


    if (InArgs._ShouldSpawnAsStaticMesh)     // Init as static mesh actor using the default static mesh specified 
    {
        WorldHandler->Initialize(
            AStaticMeshActor::StaticClass(),
            InArgs._EnablePhysics,
            InArgs._EnableFX
);
        WorldHandler->SetStaticMeshActorVisualMesh(InArgs._DefaultStaticMesh);
    }
    else      // Init as blueprint class using the default class specified
    {
        WorldHandler->Initialize(
            InArgs._DefaultSceneActor, 
            InArgs._EnablePhysics,
            InArgs._EnableFX
        );
    }

    bHasLiveSimulation = InArgs._EnablePhysics || InArgs._EnableFX;

    WorldHandler->CenterSceneActor();
    WorldHandler->SetLightRotation(InArgs._LightDirection);

    ViewportClient = MakeShareable(new FItemInspectorViewportClient
        (
            WorldHandler->GetWorld(), 
            InArgs._MinCameraDistance,
            InArgs._MaxCameraDistance,
            InArgs._DefaultDistance,
            InArgs._FieldOfView
        )
    );

    // if auto fit is flagged, calculate it now.
    if (InArgs._AutoFitCamera)
    {
        AutoFitCamera();
    }

    ChildSlot
        [
            SAssignNew(ViewportWidget, SItemInspectorViewport)
                .RenderDirectlyToWindow(false)
                .EnableGammaCorrection(false)
        ];

    SceneViewport = MakeShareable(new FSceneViewport(ViewportClient.Get(), ViewportWidget));
    ViewportWidget->SetViewportInterface(SceneViewport.ToSharedRef());

    RegisterActiveTimer(1.f / 30.f, FWidgetActiveTimerDelegate::CreateSP(this, &SItemInspector::ActiveTimerCallback));

}

void SItemInspector::ReleaseResources()
{
    // Unwind viewport chain first, before world is destroyed
    if (SceneViewport.IsValid())
    {
        SceneViewport->SetViewportClient(nullptr);
        if (ViewportWidget.IsValid())
        {
            ViewportWidget->SetViewportInterface(SceneViewport.ToSharedRef());
        }
        SceneViewport.Reset();
    }

    ViewportClient.Reset();

    // World handler cleans up the world
    WorldHandler->ReleaseResources();
}


void SItemInspector::AutoFitCamera()
{
    FVector Extent = WorldHandler->CachedBoundsExtent;
    float LargestVisibleExtent = FMath::Max(Extent.Y, Extent.Z);
    float AutoDistance = (LargestVisibleExtent / FMath::Tan(FMath::DegreesToRadians(ViewportClient->GetFieldOfView() * 0.5f))) * 1.1f; // 10% padding

    float CurrentDistance = AutoDistance;
    float MinDistance = Extent.X;          // clamp the camera distance to the extend of the actor so it can never "enter" it.
    float MaxDistance = AutoDistance * 2.0f; // can zoom out to double the auto fit distance

    ViewportClient->SetCameraDistanceRange(MinDistance, MaxDistance, CurrentDistance);
}

EActiveTimerReturnType SItemInspector::ActiveTimerCallback(double InCurrentTime, float InDeltaTime)
{
    if (!GetVisibility().IsVisible())
    {
        return EActiveTimerReturnType::Continue;
    }

    const bool bShouldUpdate = bHasLiveSimulation || bSceneDirty;

    if (bShouldUpdate)
    {
        if (WorldHandler->GetWorld())
        {
            WorldHandler->GetWorld()->Tick(LEVELTICK_All, InDeltaTime);
        }

        if (SceneViewport.IsValid())
        {
            SceneViewport->Invalidate();
        }

        bSceneDirty = false;
    }

    return EActiveTimerReturnType::Continue;
}

void SItemInspector::Tick(const FGeometry& AllottedGeometry, const double InCurrentTime, const float InDeltaTime)
{
    SCompoundWidget::Tick(AllottedGeometry, InCurrentTime, InDeltaTime);
}

void SItemInspector::UpdateCamera(const float DeltaZoom)
{
    if (ViewportClient.IsValid())
    {
        ViewportClient->UpdateCamera(0, 0, DeltaZoom);
        bSceneDirty = true;
    }
}


/* -----------------------*/
/*  END INSPECTOR WIDGET  */
/* -----------------------*/