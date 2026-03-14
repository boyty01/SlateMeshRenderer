// Copyright DMTesseract Ltd. All rights reserved.

#include "UMG/ItemInspectorWidget.h"
#include "Engine/StaticMeshActor.h"
#include "ItemInspectorViewportClient.h"

TSharedRef<SWidget> UItemInspectorWidget::RebuildWidget()
{
    // Initialize the Slate widget
    MyInspector = SNew(SItemInspector)
        .MinCameraDistance(MinCameraDistance)
        .MaxCameraDistance(MaxCameraDistance)
        .DefaultDistance(DefaultCameraDistance)
        .DefaultSceneActor(DefaultSceneActor)
        .ShouldSpawnAsStaticMesh(bInitialiseAsStaticMeshActor)
        .DefaultStaticMesh(DefaultStaticMesh)
        .LightDirection(LightDirection)
        .AutoFitCamera(bAutoFitCameraDistance)
        .FieldOfView(SceneFOV)
        ;


    if (MyInspector && MyInspector->GetWorldHandler()->GetCurrentSceneActor())
    {
        MyInspector->GetWorldHandler()->GetCurrentSceneActor()->AddActorLocalOffset(InitialSceneActorOffset);
    }
  
    return MyInspector.ToSharedRef();
}


#if WITH_EDITOR
void UItemInspectorWidget::PostEditChangeProperty(FPropertyChangedEvent& PropertyChangedEvent)
{
    Super::PostEditChangeProperty(PropertyChangedEvent);

    FName PropertyName = (PropertyChangedEvent.Property != nullptr) ? PropertyChangedEvent.Property->GetFName() : NAME_None;

    if (PropertyName == GET_MEMBER_NAME_CHECKED(UItemInspectorWidget, DefaultCameraDistance) ||
        PropertyName == GET_MEMBER_NAME_CHECKED(UItemInspectorWidget, MinCameraDistance) ||
        PropertyName == GET_MEMBER_NAME_CHECKED(UItemInspectorWidget, MaxCameraDistance))
    {
        if (MinCameraDistance > MaxCameraDistance)
        {
            MinCameraDistance = MaxCameraDistance;
        }

        DefaultCameraDistance = FMath::Clamp(DefaultCameraDistance, MinCameraDistance, MaxCameraDistance);
    }
}
#endif

UItemInspectorWidget::UItemInspectorWidget()
{
}

void UItemInspectorWidget::BeginDestroy()
{
    if (MyInspector.IsValid())
    {
        MyInspector->ReleaseResources();
    }

    Super::BeginDestroy();

}

void UItemInspectorWidget::AddSceneActorRotation(FRotator AdditiveRot)
{
    if (MyInspector->IsParentValid())
    {
       TSharedRef<FItemInspectorWorldHandler> Handler = MyInspector->GetWorldHandler();
       Handler->AddSceneActorRotation(AdditiveRot.Pitch, AdditiveRot.Yaw, AdditiveRot.Roll);
    }
}

void UItemInspectorWidget::AddZoomInput(float InDelta)
{
    if (MyInspector->IsParentValid())
    {
        MyInspector->UpdateCamera(InDelta);
    }
}

AActor* UItemInspectorWidget::SetSceneActor(TSubclassOf<AActor> ActorToSpawn)
{
    if (MyInspector->IsParentValid())
    {
        TSharedRef<FItemInspectorWorldHandler> Handler = MyInspector->GetWorldHandler();
        if (bAutoFitCameraDistance)
        {
            MyInspector->AutoFitCamera();
        }
        return Handler->SpawnSceneActor(ActorToSpawn);
    }
    return nullptr;
}

AStaticMeshActor* UItemInspectorWidget::SetSceneActorAsStaticMesh(UStaticMesh* StaticMesh)
{

    if (AStaticMeshActor* MeshActor = Cast<AStaticMeshActor>(SetSceneActor(AStaticMeshActor::StaticClass())))
    {
        if (MyInspector->IsParentValid())
        {
            TSharedRef<FItemInspectorWorldHandler> Handler = MyInspector->GetWorldHandler();
            Handler->SetStaticMeshActorVisualMesh(StaticMesh);
            if (bAutoFitCameraDistance)
            {
                MyInspector->AutoFitCamera();
            }
            return MeshActor;
        }
    }
    return nullptr;
}

AActor* UItemInspectorWidget::GetSceneActor()
{
    if (MyInspector->IsParentValid())
    {
        TSharedRef<FItemInspectorWorldHandler> Handler = MyInspector->GetWorldHandler();
        return Handler->GetCurrentSceneActor();
    }
    return nullptr;
}
ADirectionalLight* UItemInspectorWidget::GetSceneLight()
{
    if (MyInspector->IsParentValid())
    {
        TSharedRef<FItemInspectorWorldHandler> Handler = MyInspector->GetWorldHandler();    
        return Handler->GetSceneLight();
    }
    return nullptr;
}

void UItemInspectorWidget::SetSceneFieldOfView(const float NewFOV)
{
    if (MyInspector->IsParentValid())
    {
       if (TSharedPtr<FItemInspectorViewportClient> VpClient = (MyInspector->GetViewportClient()))
       {
           VpClient->SetFieldOfView(NewFOV);
       }
    }
}


void UItemInspectorWidget::ReleaseSlateResources(bool bReleaseChildren)
{
    Super::ReleaseSlateResources(bReleaseChildren);
    MyInspector.Reset();
}