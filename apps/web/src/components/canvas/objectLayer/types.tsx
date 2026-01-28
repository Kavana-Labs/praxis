export type Rect = {x: number, y: number, w: number, h: number};

export type CanvasObject = {
    id: string,
    type: string, 
    rect: Rect,
}

export type ObjectPath = {
    id: string,
    rect?: Partial<Rect>;
}