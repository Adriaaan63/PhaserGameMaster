"""
Script to process and standardize WuherAndar spritesheet:
- Extracts all 16 frames (4x4) from assets/images/WuherAndar.jpeg.
- Reconstructs the cut-off head crown in the walk-up animations (Row 2) using pixel data from idle back.
- Centers each sprite horizontally and vertically into a uniform 150x150 px frame (600x600 total spritesheet).
- Removes the solid background, producing a clean transparent PNG (assets/images/WuherAndar.png).
"""

import numpy as np
from PIL import Image
from scipy.ndimage import label


def main():
    src_path = 'assets/images/WuherAndar.jpeg'
    out_path = 'assets/images/WuherAndar.png'

    img = Image.open(src_path)
    arr = np.array(img)[:, :, :3]
    bg_ref = np.array([88, 98, 107], dtype=float)

    col_slices = [(3, 147), (150, 297), (300, 446), (449, 596)]
    row_slices = [(3, 147), (150, 292), (295, 438), (441, 597)]

    idle_back = arr[row_slices[0][0]:row_slices[0][1], col_slices[1][0]:col_slices[1][1]]
    head_crown = idle_back[6:14, :]  # 8 rows of head crown

    def extract_sprite(cell, is_row_2=False, frame_idx=0):
        ch, cw, _ = cell.shape
        if is_row_2:
            extra_top = 5
            full_h = ch + extra_top
            combined = np.full((full_h, cw, 3), [88, 98, 107], dtype=np.uint8)
            combined[extra_top + 3:, :] = cell[3:, :]

            dx_dict = {0: -1, 1: -1, 2: -1, 3: -2}
            dx = dx_dict[frame_idx]

            for r_idle in range(6, 14):
                tgt_y = (extra_top + 2) - (13 - r_idle)
                for x_idle in range(cw):
                    p = head_crown[r_idle - 6, x_idle]
                    if np.linalg.norm(p.astype(float) - bg_ref) > 22:
                        tx = x_idle + dx
                        if 0 <= tx < cw:
                            combined[tgt_y, tx] = p

            dist = np.linalg.norm(combined.astype(float) - bg_ref, axis=2)
            mask = dist > 25
            mask[-2:, :] = False
            mask[:, :2] = False
            mask[:, -2:] = False

            lbls, num = label(mask)
            if num > 0:
                sizes = np.bincount(lbls.ravel())
                for idx in range(1, len(sizes)):
                    if sizes[idx] < 15:
                        mask[lbls == idx] = False

            rgba = np.zeros((full_h, cw, 4), dtype=np.uint8)
            rgba[:, :, :3] = combined
            rgba[:, :, 3] = mask.astype(np.uint8) * 255
            return rgba
        else:
            dist = np.linalg.norm(cell.astype(float) - bg_ref, axis=2)
            mask = dist > 25
            mask[:2, :] = False
            mask[-2:, :] = False
            mask[:, :2] = False
            mask[:, -2:] = False

            lbls, num = label(mask)
            if num > 0:
                sizes = np.bincount(lbls.ravel())
                for idx in range(1, len(sizes)):
                    if sizes[idx] < 15:
                        mask[lbls == idx] = False

            rgba = np.zeros((ch, cw, 4), dtype=np.uint8)
            rgba[:, :, :3] = cell
            rgba[:, :, 3] = mask.astype(np.uint8) * 255
            return rgba

    sheet = np.zeros((600, 600, 4), dtype=np.uint8)
    base_foot_y = 139
    target_center_x = 75

    for r in range(4):
        for c in range(4):
            cell = arr[row_slices[r][0]:row_slices[r][1], col_slices[c][0]:col_slices[c][1]]
            sprite = extract_sprite(cell, is_row_2=(r == 2), frame_idx=c)
            ys, xs = np.where(sprite[:, :, 3] > 0)

            if r == 0:
                dy = base_foot_y - ys.max()
                dx = target_center_x - int(round((xs.min() + xs.max()) / 2.0))
            elif r == 1:
                dy = base_foot_y - 131
                dx = target_center_x - 72
            elif r == 2:
                dy = base_foot_y - 132
                dx = target_center_x - 72
            elif r == 3:
                dy = base_foot_y - 140
                dx = target_center_x - 73

            frame = np.zeros((150, 150, 4), dtype=np.uint8)
            sh, sw, _ = sprite.shape

            for y in range(sh):
                ty = y + dy
                if 0 <= ty < 150:
                    for x in range(sw):
                        tx = x + dx
                        if 0 <= tx < 150 and sprite[y, x, 3] > 0:
                            frame[ty, tx] = sprite[y, x]

            sheet[r*150:(r+1)*150, c*150:(c+1)*150] = frame

    Image.fromarray(sheet).save(out_path)
    print(f'Generated {out_path} (600x600, 150x150 frames, transparent PNG).')


if __name__ == '__main__':
    main()

