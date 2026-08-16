# Photo Frames

This directory contains all the photo frames that will be shipped with the app.

## Structure

```
frames/
├── frames.json           # Frame metadata and organization
├── birthday/            # Birthday themed frames
│   ├── frame1.png
│   ├── frame2.png
│   └── frame3.png
├── wedding/             # Wedding themed frames
│   ├── frame1.png
│   ├── frame2.png
│   └── frame3.png
└── corporate/           # Corporate event frames
    ├── frame1.png
    └── frame2.png
```

## Adding New Frames

### Step 1: Create a new category folder

Create a new folder for your frame category (e.g., `graduation/`, `holiday/`, etc.)

### Step 2: Add your frame images

- Add PNG images with transparent backgrounds
- Frames should be designed to overlay on top of photos
- Recommended size: 1080x1080 or higher for quality
- Use alpha channel for transparency

### Step 3: Update frames.json

Add your category and frames to the `frames.json` file:

```json
{
  "id": "graduation",
  "title": "Graduation",
  "description": "Graduation ceremony frames",
  "frames": [
    {
      "id": "graduation_1",
      "name": "Graduation Frame 1",
      "file": "graduation/frame1.png"
    }
  ]
}
```

## Frame Design Guidelines

1. **Transparent Background**: Always use PNG with alpha channel
2. **Size**: Minimum 1080x1080px for good quality
3. **Safe Area**: Keep important elements away from edges (50px margin)
4. **Color**: Design frames that work with various photo backgrounds
5. **Text**: If adding text to frames, ensure it's readable

## QR Code Integration

When generating QR codes on the Pi device, include the category ID:

```
dots://link?session=ABC123&frame_folder=birthday
```

The app will automatically load frames from the specified category.

## Frame Application

Frames are applied as overlays on top of captured photos using:
- The photo is displayed as the base layer
- The selected frame is overlaid on top
- User can swipe left/right to change frames
- Final image is composited and saved to gallery

