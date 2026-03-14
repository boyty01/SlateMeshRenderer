// Copyright DMTesseract Ltd. All rights reserved.

#include "Slate/SItemInspectorViewport.h"


void SItemInspectorViewport::Construct(const FArguments& InArgs)
{
    SViewport::Construct(
        SViewport::FArguments()
        .RenderDirectlyToWindow(InArgs._RenderDirectlyToWindow)
        .EnableGammaCorrection(InArgs._EnableGammaCorrection)
        .EnableBlending(true)
        .IgnoreTextureAlpha(false)
    );

}


int32 SItemInspectorViewport::OnPaint(const FPaintArgs& Args, const FGeometry& AllottedGeometry, const FSlateRect& MyCullingRect, FSlateWindowElementList& OutDrawElements, int32 LayerId, const FWidgetStyle& InWidgetStyle, bool bParentEnabled) const
{
    bool bEnabled = ShouldBeEnabled(bParentEnabled);
    ESlateDrawEffect DrawEffects = ESlateDrawEffect::InvertAlpha;
    DrawEffects |= ESlateDrawEffect::NoGamma;
    TSharedPtr<ISlateViewport> ViewportInterfacePin = ViewportInterface.Pin();

    if (ViewportInterfacePin.IsValid())
    {
        ViewportInterfacePin->OnDrawViewport(AllottedGeometry, MyCullingRect, OutDrawElements, LayerId, InWidgetStyle, bParentEnabled);
    }

    if (!ShouldRenderDirectly())
    {
        if (ViewportInterfacePin.IsValid() && ViewportInterfacePin->GetViewportRenderTargetTexture() != nullptr)
        {
            FSlateDrawElement::MakeViewport(
                OutDrawElements,
                LayerId,
                AllottedGeometry.ToPaintGeometry(),
                ViewportInterfacePin,
                DrawEffects,
                InWidgetStyle.GetColorAndOpacityTint()
            );
        }
    }

    return SCompoundWidget::OnPaint(Args, AllottedGeometry, MyCullingRect, OutDrawElements, LayerId, InWidgetStyle, bEnabled);
}
