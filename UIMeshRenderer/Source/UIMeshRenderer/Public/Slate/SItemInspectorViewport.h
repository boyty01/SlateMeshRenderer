// Copyright DMTesseract Ltd. All rights reserved.

#pragma once
#include "Widgets/SViewport.h"

/*
* Custom viewport for the Item inspector view. 
* Does not support focus directly, acts purely as a canvas for drawing the scene. 
* Inputs are be handled by the actual game viewport as standard.
*/
class SItemInspectorViewport : public SViewport
{
public:
    SLATE_BEGIN_ARGS(SItemInspectorViewport)
        : _EnableGammaCorrection(false)
        , _RenderDirectlyToWindow(false)
        {
        }
        SLATE_ARGUMENT(bool, EnableGammaCorrection)
        SLATE_ARGUMENT(bool, RenderDirectlyToWindow)
    SLATE_END_ARGS()

    void Construct(const FArguments& InArgs);


    virtual int32 OnPaint(
        const FPaintArgs& Args,
        const FGeometry& AllottedGeometry,
        const FSlateRect& MyCullingRect,
        FSlateWindowElementList& OutDrawElements,
        int32 LayerId,
        const FWidgetStyle& InWidgetStyle,
        bool bParentEnabled) const override;
   

    virtual bool SupportsKeyboardFocus() const override { return false; }
};