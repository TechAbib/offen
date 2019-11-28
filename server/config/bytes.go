package config

import "encoding/base64"

// Bytes is a byte slice.
type Bytes []byte

// Decode decodes a base64 encoded string into b.
func (b *Bytes) Decode(v string) error {
	d, err := base64.StdEncoding.DecodeString(v)
	if err != nil {
		return err
	}
	*b = Bytes(d)
	return nil
}

// Bytes unwraps b and returns its value as a byte slice.
func (b *Bytes) Bytes() []byte {
	return []byte(*b)
}
