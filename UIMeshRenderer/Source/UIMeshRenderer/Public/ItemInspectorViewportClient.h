// Copyright DMTesseract Ltd. All rights reserved.

#pragma once

#include "CoreMinimal.h"
#include "UnrealClient.h"
#include "UObject/GCObject.h"

class FItemInspectorViewportClient : public FViewportClient, public FGCObject
{
public:

    FItemInspectorViewportClient(UWorld* InWorld, const float InMinDistance, const float InMaxDistance, const float InDefaultDistance, const float InFieldOfView = 60.f);

    // FViewportClient Interface
    virtual void Draw(FViewport* Viewport, FCanvas* Canvas) override;

    virtual UWorld* GetWorld() const override { return PreviewWorld; }

    // FGCObject Interface (Prevents GC of our World)
    virtual void AddReferencedObjects(FReferenceCollector& Collector) override;
    virtual FString GetReferencerName() const override { return TEXT("FItemInspectorViewportClient"); }


    // Camera/Inspect Controls
    FRotator MeshRotation;
    float ViewDistance;
    FVector LookAtLocation;

    FVector CameraLocation;
    FRotator CameraRotation;

    float GetFieldOfView() const { return FOV; };
    void SetFieldOfView(const float _FOV) { FOV = _FOV; };

    void SetCameraDistance(const float NewDistance) { CurrentDistance = NewDistance; };
    void SetCameraDistanceRange(const float _Min, const float _Max, const float _Current)
    {
        MinDistance = _Min;
        MaxDistance = _Max;
        CurrentDistance = _Current;
    }
    void UpdateCamera(const float DeltaYaw, const float DeltaPitch, const float DeltaZoom);

    virtual bool RequiresHitProxyStorage() override { return false; }
    virtual EMouseCaptureMode GetMouseCaptureMode() const override { return EMouseCaptureMode::NoCapture; }
    virtual bool CaptureMouseOnLaunch() override { return false; }
    virtual bool LockDuringCapture() override { return false; }
    virtual bool HideCursorDuringCapture() const override { return false; }

private:
    float FOV{ 60.0f };
    float CurrentDistance;
    float MinDistance;
    float MaxDistance;

    TObjectPtr<UWorld> PreviewWorld;

  };