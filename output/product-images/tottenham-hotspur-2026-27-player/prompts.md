# Spurs Home product image processing

Built-in `image_gen` was used to edit the front and back photographs. The selected transparent PNGs were converted to WebP with Sharp (quality 85, lossless alpha quality 100, generated 1254px canvas retained).

## Main prompt (both views)

Remove the entire black mannequin (neck, arms, hands, watch/accessories and support) and remove all background, metal mesh, shelves and stand. Keep only the actual Tottenham Hotspur Home jersey as a clean, realistic ghost-mannequin garment cutout with genuinely transparent alpha everywhere outside the garment and in its open collar and sleeve openings.

Preserve the original jersey identity: white fabric and subtle diagonal textured pattern, navy trim and panels, sleeve badge, original stitching, proportions, folds and shirt outline. Reconstruct only fabric obscured by the mannequin where strictly necessary. Keep the same perspective and lighting of the photographed shirt. Do not flatten it or invent a different product.

One jersey only, full garment visible and centered in a square canvas with modest even padding, neck-to-hem fully included, natural supported garment shape. No black body parts, no props, no drop shadow, no colored or white background, no checkerboard drawn into the pixels, no watermark or extra text.

## Front invariants

Preserve the large red AIA sponsor lettering, navy Nike swoosh, navy Tottenham cockerel crest and small lower hem label. Do not alter or remove any of these existing jersey markings.

## Back invariants

Preserve the plain textured white back, navy side inserts, navy sleeve edge trim and purple sleeve badge. This is the back of the shirt: do not add AIA, a crest, a player name, number or any front-view markings.

## Edge cleanup prompt

Remove isolated white specks, extraneous fuzzy pixels, white halos, blue/magenta fringes and thin horizontal remnant lines outside the actual shirt silhouette, including above the collar, beneath the hem and beside the sleeves and sides. Preserve the photographed jersey interior: shirt design, fabric texture, wrinkles, proportions, collar, sleeve edges, logos, sponsor lettering and badge where present. Outside the garment and empty sleeve holes must be transparent alpha with naturally antialiased edges.

The front version that best preserved the original details and the back version with cleaner edges were selected. Original uploads and generated PNGs were retained.
