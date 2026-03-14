// Copyright DMTesseract Ltd. All rights reserved.

#include "ItemInspectorViewportClient.h"
#include "SceneView.h"
#include "UnrealClient.h"
#include "LegacyScreenPercentageDriver.h"
#include "CanvasTypes.h"
#include <Components/Viewport.h>
#include <CanvasItem.h>


FItemInspectorViewportClient::FItemInspectorViewportClient(UWorld* InWorld, const float InMinDistance, const float InMaxDistance, const float InDefaultDistance, const float InFieldOfView)
    : ViewDistance(400.f)
    , LookAtLocation(FVector::ZeroVector)
    , FOV(InFieldOfView)
    , PreviewWorld(InWorld)
{
    CurrentDistance = InDefaultDistance;
    MinDistance = InMinDistance;
    MaxDistance = InMaxDistance;

}

void FItemInspectorViewportClient::UpdateCamera(const float DeltaYaw, const float DeltaPitch, const float DeltaZoom)
{
    CurrentDistance = FMath::Clamp(CurrentDistance + DeltaZoom, MinDistance, MaxDistance);
}

void FItemInspectorViewportClient::Draw(FViewport* Viewport, FCanvas* Canvas)
{
   CameraLocation = FVector(CurrentDistance, 0.0f, 0.0f);


    if (!PreviewWorld || !PreviewWorld->Scene) return;

    Canvas->Clear(FLinearColor::Transparent);

    FSceneViewFamilyContext ViewFamily(FSceneViewFamily::ConstructionValues(
        Viewport,
        PreviewWorld->Scene,
        FEngineShowFlags(ESFIM_Game))
        .SetTime(FGameTime::GetTimeSinceAppStart())
        .SetRealtimeUpdate(true)
        .SetDeferClear(true)
    );

    ViewFamily.EngineShowFlags.SetTranslucency(true);
    ViewFamily.EngineShowFlags.SetPostProcessing(true);
    ViewFamily.EngineShowFlags.SetTonemapper(true);
    ViewFamily.EngineShowFlags.SetBloom(false);         
    ViewFamily.EngineShowFlags.SetFog(false);           
    ViewFamily.EngineShowFlags.SetAtmosphere(false);
    ViewFamily.EngineShowFlags.SetVignette(false);      
    ViewFamily.EngineShowFlags.SetAntiAliasing(true);
    ViewFamily.EngineShowFlags.SetEyeAdaptation(false);
    ViewFamily.SetScreenPercentageInterface(new FLegacyScreenPercentageDriver(ViewFamily, 1.0f));
    ViewFamily.bResolveScene = true;


    const FIntPoint RawSize = Viewport->GetSizeXY();
    const uint64 CurrentFrame = GFrameCounter;
    const float DPIScale = FSlateApplication::Get().GetApplicationScale();
    FIntPoint FinalSize(
        FMath::RoundToInt(RawSize.X * DPIScale),
        FMath::RoundToInt(RawSize.Y * DPIScale)
    );

    // clamp designer view to low res for performance reasons. If designers zoom in too far, the resolution can balloon to massive sizes, completely eating the GPU's VRAM.
#if WITH_EDITOR
    if (GIsEditor && !GWorld->HasBegunPlay())
    {
        FinalSize.X = FMath::Clamp(FinalSize.X, 1, 1024);
        FinalSize.Y = FMath::Clamp(FinalSize.Y, 1, 1024);
    }
#endif
  
    FSceneViewInitOptions ViewInitOptions;
    ViewInitOptions.ViewFamily = &ViewFamily;
    ViewInitOptions.SetViewRectangle(FIntRect(0, 0, FinalSize.X, FinalSize.Y));

    ViewInitOptions.BackgroundColor = FLinearColor::Transparent;
    ViewInitOptions.ViewOrigin = CameraLocation;
    ViewInitOptions.ViewRotationMatrix = FLookAtMatrix(
        CameraLocation,
        FVector::ZeroVector,  
        FVector::UpVector
    );

    ViewInitOptions.ProjectionMatrix = FReversedZPerspectiveMatrix(
        FMath::DegreesToRadians(FOV * 0.5f),
        (float)FinalSize.X / (float)FinalSize.Y,
        1.0f,
        GNearClippingPlane
    );

    FSceneView* View = new FSceneView(ViewInitOptions);
    View->bIsGameView = true;
    ViewFamily.Views.Add(View);

    FModuleManager::GetModuleChecked<IRendererModule>("Renderer").BeginRenderingViewFamily(Canvas, &ViewFamily);

}

void FItemInspectorViewportClient::AddReferencedObjects(FReferenceCollector& Collector)
{
    Collector.AddReferencedObject(PreviewWorld);
}