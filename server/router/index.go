package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (rt *router) getIndex(c *gin.Context) {
	c.HTML(http.StatusOK, "index.go.html", map[string]interface{}{
		"rootAccount": rt.config.App.RootAccount,
	})
}